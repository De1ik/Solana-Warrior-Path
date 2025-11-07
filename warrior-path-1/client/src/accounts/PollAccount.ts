import { PublicKey } from "@solana/web3.js";
import { VotingPhase } from "../types/VotingPhase"

export class PollState {
    discriminator!: string;
    title!: string;
    description!: string;
    phase!: number;
    party_counter!: number;
    owner!: Uint8Array;
    expected_new_owner!: Uint8Array;
    created_at!: bigint;
    voting_start_at!: bigint;

    constructor(fields: Partial<PollState> = {}) {
        Object.assign(this, fields);
    }

    getOwnerPubkey(): PublicKey {
        return new PublicKey(this.owner);
    }

    getExpactedNewOwnerPubkey(): PublicKey {
        return new PublicKey(this.expected_new_owner);
    }

    getVotingPhase(): VotingPhase {
        return this.phase as VotingPhase;
    }
}

export const PollStateSchema = new Map([
    [
        PollState, {
            kind: "struct",
            fields: [
                ["discriminator", "string"],
                ["title", "string"],
                ["description", "string"],
                ["phase", "u8"],
                ["parties", ["vector", [32]]],
                ["owner", [32]],
                ["expected_new_owner", [32]],
                ["created_at", "i64"],
                ["voting_start_at", "i64"],
            ],
        },
    ],
])