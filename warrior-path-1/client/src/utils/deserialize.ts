// import { deserialize } from "borsh";

// export function deserializeAccount<T>(
//     schema: Map<any, any>,
//     classType: any, 
//     data: Buffer,
//     skipDiscriminator = false,
// ): T {
//     const rawData = skipDiscriminator ? data.slice(8) : data;
//     return deserialize(schema, classType, rawData) as T;
// }

// Generic Borsh deserializer that handles Rust enums properly
export class BorshDeserializer {
    private offset: number = 0;
    private data: Buffer;

    constructor(data: Buffer) {
        this.data = data;
        this.offset = 0;
    }

    // Read a string (length-prefixed)
    readString(): string {
        const length = this.readU32();
        const stringData = this.data.slice(this.offset, this.offset + length);
        this.offset += length;
        return stringData.toString();
    }

    // Read a u8
    readU8(): number {
        const value = this.data.readUInt8(this.offset);
        this.offset += 1;
        return value;
    }

    // Read a u32
    readU32(): number {
        const value = this.data.readUInt32LE(this.offset);
        this.offset += 4;
        return value;
    }

    // Read a u64
    readU64(): bigint {
        const value = this.data.readBigUInt64LE(this.offset);
        this.offset += 8;
        return value;
    }

    // Read an i64
    readI64(): bigint {
        const value = this.data.readBigInt64LE(this.offset);
        this.offset += 8;
        return value;
    }

    // Read a Pubkey (32 bytes)
    readPubkey(): Uint8Array {
        const pubkey = new Uint8Array(this.data.slice(this.offset, this.offset + 32));
        this.offset += 32;
        return pubkey;
    }

    // Read a vector of Pubkeys
    readPubkeyVector(): Uint8Array[] {
        const length = this.readU32();
        const pubkeys: Uint8Array[] = [];
        for (let i = 0; i < length; i++) {
            pubkeys.push(this.readPubkey());
        }
        return pubkeys;
    }

    // Read a vector of any type using a custom reader function
    readVector<T>(reader: () => T): T[] {
        const length = this.readU32();
        const items: T[] = [];
        for (let i = 0; i < length; i++) {
            items.push(reader());
        }
        return items;
    }

    // Get remaining data length
    getRemainingLength(): number {
        return this.data.length - this.offset;
    }

    // Reset offset (useful for debugging)
    reset(): void {
        this.offset = 0;
    }
}

// Generic deserializer factory
export function createDeserializer(data: Buffer): BorshDeserializer {
    return new BorshDeserializer(data);
}

// Specific deserializers for each account type
export function deserializePollState(data: Buffer): any {
    const deserializer = createDeserializer(data);
    
    return {
        discriminator: deserializer.readString(),
        title: deserializer.readString(),
        description: deserializer.readString(),
        phase: deserializer.readU8(), // VotingPhase enum as u8
        party_counter: Number(deserializer.readU64()), // Convert BigInt to number
        owner: deserializer.readPubkey(),
        expected_new_owner: deserializer.readPubkey(),
        created_at: deserializer.readI64(),
        voting_start_at: deserializer.readI64()
    };
}

export function deserializePartyAccount(data: Buffer): any {
    const deserializer = createDeserializer(data);
    
    return {
        discriminator: deserializer.readString(),
        poll_id: deserializer.readPubkey(),
        title: deserializer.readString(),
        positive_votes: Number(deserializer.readU64()),
        negative_votes: Number(deserializer.readU64())
    };
}

export function deserializeVoterAccount(data: Buffer): any {
    const deserializer = createDeserializer(data);
    
    return {
        discriminator: deserializer.readString(),
        poll_key: deserializer.readPubkey(),
        voter_key: deserializer.readPubkey(),
        positive_used: deserializer.readU8(),
        negative_used: deserializer.readU8(),
        voted_parties: deserializer.readPubkeyVector()
    };
}