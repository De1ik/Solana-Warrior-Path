# Janeček Voting (warrior-path-1)

Native Solana program (no Anchor) implementing a Janeček-style voting flow. Includes Rust integration tests using `solana-program-test` and a TypeScript client skeleton.

## Quick Start

- Prerequisites: `rustup` + stable toolchain, `cargo`.
- Optional: `node` ≥ 18 if you plan to build or test the client in `client/`.
- Build program: `cd janecek_voting && cargo build`

## Running Tests

All on-chain tests are Rust integration tests under `janecek_voting/tests` and run entirely with `solana-program-test` (no external validator needed).

- From the program directory: `cd janecek_voting`
- Default run: `cargo test`
- Faster gating (feature flag): `cargo test --features test-mode`

About `test-mode`:
- The program enforces time windows for phase transitions:
  - Registration → Voting minimum: 24h (production) or 1s (`test-mode`).
  - Voting period end threshold: 7 days (production) or 60s (`test-mode`).
- Tests here use `solana-program-test` to warp time by writing the Clock sysvar, so they pass without `test-mode`. Use `--features test-mode` to simplify or speed up ad‑hoc tests where you don’t manipulate time.

## Task Overview

Implements a poll-based Janeček voting system:
- Create a poll with deterministic PDA seeds derived from `hash(title)` and `hash(description)`.
- Add parties under the poll during Registration.
- Start voting after a minimum registration duration.
- Voting rules: up to 2 positive votes and 1 negative vote (negative only after using both positive votes), single vote per party.
- Voting period auto-transitions to Results after the time threshold.

## What’s Implemented

- Accounts
  - `PollState`: title, description, phase, owner, timestamps, party counter.
  - `PartyAccount`: poll id, title, positive/negative vote counters.
  - `VoterAccount`: voter/poll keys, used votes, and voted parties (bounded list).

- Instructions (see `src/processor.rs`)
  - CreatePoll: initializes poll PDA and sets Registration phase.
  - CreateParty: creates party PDA; only allowed during Registration; increments poll party counter.
  - InitiateOwnerTransfer / AcceptOwnerTransfer: two-step owner handover via `expected_new_owner`.
  - StartVoting: requires minimum registration duration (feature-gated in tests).
  - Vote: enforces Janeček vote rules; prevents duplicate party votes; sets phase to Results when voting period elapses.
  - EndVoting: currently a placeholder (no-op).

- PDA Seeds
  - Poll: `seeds = [b"poll", hash(title), hash(description)]`.
  - Party: `seeds = [b"party", poll_pubkey, hash(party_title)]`.
  - Voter: `seeds = [b"voter", poll_pubkey, voter_pubkey]`.

- Feature flag
  - `test-mode` defined in `janecek_voting/Cargo.toml`; used in `src/processor.rs` to reduce time windows in tests.

## Repository Layout

- `janecek_voting/` — On-chain program source and Rust tests.
  - `src/{entrypoint.rs,instruction.rs,processor.rs,state.rs,error.rs}`.
  - `tests/*.rs` — integration tests using `solana-program-test` (Clock sysvar time-warping).
- `client/` — TypeScript client skeleton (optional for tests).

## Common Issues

- Rust deps mismatch: ensure toolchain matches `solana-program` 1.18.x used by the crate.
- Time checks failing: run tests as written (they warp time) or enable `--features test-mode` for faster thresholds.

## Useful Commands

- `cd janecek_voting && cargo build` — Build the program.
- `cd janecek_voting && cargo test` — Run integration tests.
- `cd janecek_voting && cargo test --features test-mode` — Run tests with shorter time windows.

