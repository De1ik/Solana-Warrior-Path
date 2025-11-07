import { Connection, PublicKey } from "@solana/web3.js";
import { PollState } from "../accounts/PollAccount";
import { createAccountDeserializer } from "./accountService";

export async function getPollState(
    connection: Connection,
    pollPda: PublicKey,
): Promise<PollState> {
    const deserializer = createAccountDeserializer(connection);
    return deserializer.getPollState(pollPda);
}