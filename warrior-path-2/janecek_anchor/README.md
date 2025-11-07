# Janeček Anchor Program

A Solana Anchor program implementing a Janeček-style voting system with optional token rewards per party. The workspace includes the on-chain program, TypeScript test scaffold, and Anchor configuration for local development.

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
  - `init_party`: Creates a party PDA under a poll; validates `hash(title)`; when `reward_enabled`, lazily creates and initializes a `Mint` PDA for the party.
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

- Feature flag
  - Cargo feature `test-fast` defined in `programs/janecek_anchor/Cargo.toml` and used in phase timing checks.

## Repository Layout

- `Anchor.toml` — Workspace, scripts, program IDs, provider config.
- `programs/janecek_anchor` — On-chain program source.
  - `src/lib.rs`, `src/instructions/*`, `src/state.rs`, `src/errors.rs`.
  - `Cargo.toml` — includes the `test-fast` feature.
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

