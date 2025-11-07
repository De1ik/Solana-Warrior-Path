import { Connection, PublicKey } from "@solana/web3.js";
import { PollState } from "../accounts/PollAccount";
import { PartyAccount } from "../accounts/PartyAccount";
import { VoterAccount } from "../accounts/VoterAccount";
import { 
    deserializePollState, 
    deserializePartyAccount, 
    deserializeVoterAccount,
    BorshDeserializer 
} from "../utils/deserialize";

// Generic account deserializer that can handle any account type
export class AccountDeserializer {
    private connection: Connection;

    constructor(connection: Connection) {
        this.connection = connection;
    }

    async deserializeAccount<T>(
        accountPda: PublicKey,
        deserializerFn: (data: Buffer) => any,
        classType: new (fields: any) => T
    ): Promise<T> {
        const accountInfo = await this.connection.getAccountInfo(accountPda);
        if (!accountInfo) throw new Error("Account not found");

        try {
            const deserializedData = deserializerFn(accountInfo.data);
            return new classType(deserializedData);
        } catch (error) {
            console.error('Deserialization error:', error);
            throw error;
        }
    }

    // Specific methods for each account type
    async getPollState(pollPda: PublicKey): Promise<PollState> {
        return this.deserializeAccount(pollPda, deserializePollState, PollState);
    }

    async getPartyAccount(partyPda: PublicKey): Promise<PartyAccount> {
        return this.deserializeAccount(partyPda, deserializePartyAccount, PartyAccount);
    }

    async getVoterAccount(voterPda: PublicKey): Promise<VoterAccount> {
        return this.deserializeAccount(voterPda, deserializeVoterAccount, VoterAccount);
    }
}

// Factory function to create an account deserializer
export function createAccountDeserializer(connection: Connection): AccountDeserializer {
    return new AccountDeserializer(connection);
}
