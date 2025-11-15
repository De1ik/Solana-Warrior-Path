# Janeček Anchor Program

A Solana Anchor program implementing a Janeček-style voting system with optional token rewards per party. The workspace includes on-chain programs, TypeScript test, and Anchor configuration for local development.

## Quick Start

- Prerequisites: `solana-cli`, `anchor-cli` (v0.31.x), `rustup`, `node` ≥ 18, `yarn`.
- Configure Solana and wallet:
  - `solana config set --url localhost`
  - Ensure a keypair exists at `~/.config/solana/id.json` (create with `solana-keygen new` if needed)
- Install JS deps: `yarn install`
- Build program: `anchor build`

## Task Overview

Implement a poll-based Janeček voting system with optional token rewards:
- Create a poll with title and description hashed into deterministic PDAs.
- Add parties (optionally with rewards) under the poll.
- Controlled phase transitions: Registration → Voting → Results with time gating.
- Vote logic: up to 2 positive votes and 1 negative vote (only after both positive votes are used), with per-party single-vote enforcement.
- Optional token reward: positive votes can mint a 1-token reward to the voter’s ATA when enabled for the party.

## What’s Implemented

- Accounts
  - `PollAccount`: poll metadata, phase, owner, timestamps.
  - `PartyAccount`: party metadata, reward toggle, vote counters, optional mint, PDA bump.
  - `VoterAccount`: per-voter state tracking used votes and voted parties.

- Instructions
  - `init_poll`: Creates a poll PDA seeded by `hash(title)` and `hash(description)`; validates provided hashes; sets phase to Registration and records timestamps and owner.
  - `init_reward_party`: Creates a party PDA under a poll with reward enabled feature; validates `hash(title)`, lazily creates and initializes a `Mint` PDA for the party.
  - `init_non_reward_party`: Creates a party PDA under a poll without enabled reward feature; validates `hash(title)`;
  - `init_owner_transfer` / `accept_owner`: Two-step owner transfer using `expected_new_owner`.
  - `start_voting`: Transitions from Registration to Voting; enforces a minimum registration duration (0 in `test-fast`).
  - `finish_voting`: Transitions from Voting to Results; enforces a minimum voting duration (0 in `test-fast`).
  - `free_vote`: Records votes without rewards; enforces 2 positive + 1 negative (after two positives), prohibits duplicate party votes, and respects the voting window.
  - `reward_vote`: Same voting rules as `free_vote`, plus:
    - Verifies party rewards are enabled and mint address matches.
    - Ensures voter ATA for the party’s mint exists (creates if missing).
    - Mints 1 token to the voter ATA using the party PDA as mint authority.

- PDAs and Seeds
  - Poll: `seeds = [b"poll", hash(title), hash(description)]`.
  - Party: `seeds = [b"party", poll.key(), hash(party_title)]`.
  - Mint (reward): `seeds = [b"mint", poll.key(), hash(party_title)]`.
  - Voter state: `seeds = [b"voter", poll.key(), voter.key()]`.

- SPL Token-2022 Reward Mint
  - Rewarded parties create a dedicated mint with SPL Token-2022 extensions enabled.
  - `extensions::transfer_hook` wires the mint to the hook program so every token transfer triggers our custom logic.
  - `extensions::permanent_delegate` points at `GLOBAL_PERMANENT_DELEGATE`, giving a trusted authority the ability to step in when users need recovery or enforcement.

## Transfer Hook Program & Token-2022 Extensions

Reward tokens rely on Token-2022 features so we can encode transfer rules directly into the mint:

- `initialize_party_with_reward` ( `programs/janecek_anchor/src/instructions/initialize_party_with_reward.rs`) initializes the mint with the transfer-hook extension targeting the `hook_program` located at `programs/hook_program`. The party PDA is both the mint authority and the hook authority.
- The same CPI call sets the permanent delegate extension to the `GLOBAL_PERMANENT_DELEGATE` constant defined in `programs/janecek_anchor/src/lib.rs`. This delegate can always authorize transfers, which the hook program also recognizes.
- When `reward_vote` mints the 1-token reward, it relies on the Token-2022 interface so that future transfers automatically run through the hook without extra instructions from clients.

The hook program keeps the enforcement tight:

- `programs/hook_program/src/lib.rs` reads the mint data with `StateWithExtensions<Mint2022>` and extracts the `PermanentDelegate` extension when present.
- Transfers succeed only if the signer passed to the hook matches either the owner of the source token account or the recorded permanent delegate; otherwise it throws `HookError::Unauthorized`.
- The entrypoint implements the SPL Transfer Hook Interface via the `fallback` handler so SPL Token-2022 runtimes can dispatch the standard `Execute` instruction to the Anchor-generated `transfer_hook`.

- Feature flag
  - Cargo feature `test-fast` defined in `programs/janecek_anchor/Cargo.toml` and used in phase timing checks.

## Repository Layout

- `Anchor.toml` — Workspace, scripts, program IDs, provider config.
- `programs/janecek_anchor` — On-chain program source.
  - `src/lib.rs`, `src/instructions/*`, `src/state.rs`, `src/errors.rs`.
  - `Cargo.toml` — includes the `test-fast` feature.
- `programs/hook_program` — Transfer-hook validator built with Anchor + SPL Token-2022 that guards every reward-token transfer.
- `tests/janecek_anchor.ts` — TypeScript test scaffold (commented by default).
- `package.json` — JS deps and prettier scripts; Anchor runs `ts-mocha` via `Anchor.toml`.

## Running Tests

Anchor runs `ts-mocha` as defined in `Anchor.toml`.

- Fast (recommended): `anchor test -- --features test-fast`
- Normal constraints: `anchor test`

If you prefer to run Mocha directly: `yarn ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts`

Note: The scaffolded test file is at `tests/janecek_anchor.ts`. Uncomment and extend it to cover your flows.

## Why use `--features test-fast`?

The program enforces time-based phase transitions on-chain:
- Registration → Voting requires ≥ 24 hours.
- Voting → Results requires ≥ 7 days.

For local tests, waiting real time is impractical. The `test-fast` cargo feature compiles conditional constants that set both minimum time windows to `0`, allowing immediate transitions in tests. Without this flag, tests will fail or hang on time checks with errors such as `RegistrationPhaseTooShort` or `VotingWasNotFinished` because the required time has not elapsed.

Where this is applied (compile-time):
- `start_voting` sets the registration minimum delta to `0` under `feature = "test-fast"`.
- `close_voting` sets the voting minimum delta to `0` under `feature = "test-fast"`.

Command summary:
- Recommended during development: `anchor test -- --features test-fast`
- To test real production constraints: run `anchor test` and design tests that account for time (e.g., time warping or mocks where applicable).

## Common Issues

- Missing deps: run `yarn install` before `anchor test`.
- Wrong cluster or wallet: ensure `Anchor.toml` provider matches your local setup.
- Not using `--features test-fast`: phase transition tests will fail due to unmet time requirements.

## Useful Commands

- `anchor keys list` — Verify program IDs.
- `solana-test-validator` — Start a validator manually (Anchor will start one automatically for tests).
- `anchor build -- --features test-fast` — Build with fast test feature.
- `anchor test -- --features test-fast` — Run tests with fast phase transitions.
