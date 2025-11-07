import { PublicKey } from "@solana/web3.js";

export class VoterAccount {
    discriminator!: string;
    poll_key!: Uint8Array;
    voter_key!: Uint8Array;
    positive_used!: number;
    negative_used!: number;
    voted_parties!: Uint8Array[];

    constructor(fields: Partial<VoterAccount> = {}) {
        Object.assign(this, fields);
    }

    getPollKeyPubkey(): PublicKey {
        return new PublicKey(this.poll_key);
    }

    getVoterKeyPubkey(): PublicKey {
        return new PublicKey(this.voter_key);
    }

    getVotedPartiesPubkeys(): PublicKey[] {
        return this.voted_parties.map(party => new PublicKey(party));
    }
}
