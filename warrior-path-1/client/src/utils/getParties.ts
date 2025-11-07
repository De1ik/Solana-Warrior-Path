import { Connection, PublicKey } from "@solana/web3.js";
import { createAccountDeserializer } from "../services/accountService";
import { CONFIG } from "../config";
import { PartyAccount } from "../accounts/PartyAccount";

export async function getAllPartiesForPoll(
    connection: Connection,
    pollPda: PublicKey,
): Promise<{ pubkey: PublicKey; account: PartyAccount }[]> {

    const accounts = await connection.getProgramAccounts(CONFIG.programId, {
        filters: [
            {
                memcmp: {
                    offset: 4 + "party".length,
                    bytes: pollPda.toBase58(),
                },
            },
        ],
    });

    const deserializer = createAccountDeserializer(connection);

    const result = await Promise.all(
        accounts.map(async ({ pubkey }) => {
            const account = await deserializer.getPartyAccount(pubkey);
            return { pubkey, account };
        })
    );
    
    return result;
}