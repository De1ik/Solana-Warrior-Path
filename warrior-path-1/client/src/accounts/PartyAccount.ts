import { PublicKey } from "@solana/web3.js";

export class PartyAccount {
    discriminator!: string;
    poll_id!: Uint8Array;
    title!: string;
    positive_votes!: bigint;
    negative_votes!: bigint;

    constructor(fields: Partial<PartyAccount> = {}) {
        Object.assign(this, fields);
    }

    getPollIdPubkey(): PublicKey {
        return new PublicKey(this.poll_id);
    }
}
