import { PublicKey, TransactionInstruction, Transaction, Connection, Keypair, SystemProgram } from "@solana/web3.js";
import { serializeAccount } from "../utils/serialize";
import { PdaDerivation } from "../utils/derivePda";
import { InstructionDiscriminator } from "../types/Discriminator";
import { CreatePartyPayload, CreatePollPayload, CreateTransferOwnerPayload, PayloadSchemas, VotePayload } from "../types/payloads";


export class TransactionService {
    programId!: PublicKey;
    connection!: Connection;
    
    constructor(programId: PublicKey, connection: Connection) {
        this.programId = programId;
        this.connection = connection;
    }

    async createParty(
        payer: Keypair,
        pollPda: PublicKey,
        title: string,
    ) { 
        const [partyPda] = PdaDerivation.derivePartyPda(this.programId, pollPda, title);
    
        const payload = new CreatePartyPayload({title});
        const serialized = serializeAccount(PayloadSchemas.CreatePartySchema, CreatePartyPayload, payload);
    
        const variant = Buffer.from(Uint8Array.of(InstructionDiscriminator.CreateParty));
        const data = Buffer.concat([variant, serialized]);
    
        const instruction = new TransactionInstruction({
            keys: [
                { pubkey: payer.publicKey, isSigner: true, isWritable: true },
                { pubkey: pollPda, isSigner: false, isWritable: true },
                { pubkey: partyPda, isSigner: false, isWritable: true },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            ],
            programId: this.programId,
            data
        });
    
        const tx = new Transaction().add(instruction);
        const signature = await this.connection.sendTransaction(tx, [payer]);
        return { partyPda, signature }
    }

    async createPoll(
        payer: Keypair,
        title: string,
        description: string,
    ) {
        const [pollPda] = PdaDerivation.derivePollPda(this.programId, title, description);
    
        const payload = new CreatePollPayload({title, description});
        const serialized = serializeAccount(PayloadSchemas.CreatePollSchema, CreatePollPayload, payload);
    
        const variant = Buffer.from(Uint8Array.of(InstructionDiscriminator.CreatePoll));
        const data = Buffer.concat([variant, serialized]);
    
        const instruction = new TransactionInstruction({
            keys: [
                { pubkey: payer.publicKey, isSigner: true, isWritable: true },
                { pubkey: pollPda, isSigner: false, isWritable: true },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            ],
            programId: this.programId,
            data,
        });
    
        const tx = new Transaction().add(instruction);
        const signature = await this.connection.sendTransaction(tx, [payer]);
        return { pollPda, signature }; 
    }   

    async startVoting(
        payer: Keypair,
        pollPda: PublicKey,
    ): Promise<string | undefined> {
        const data = Buffer.from(Uint8Array.of(InstructionDiscriminator.StartVoting));
    
        const instruction = new TransactionInstruction({
            keys: [
                { pubkey: payer.publicKey, isSigner: true, isWritable: true },
                { pubkey: pollPda, isSigner: false, isWritable: true },
            ],
            programId: this.programId,
            data
        });
    
        const tx = new Transaction().add(instruction);
        try{
            const signature = await this.connection.sendTransaction(tx, [payer]);
            return signature;
        } catch (error) {
            // console.error('Error starting voting:', error);
            return undefined;
        }
    }

    async initiateOwnerTransfer(
        payer: Keypair,
        pollPda: PublicKey,
        newOwner: PublicKey,
    ) {
        console.log('Initiating owner transfer...');
        console.log('New owner:', newOwner.toString());
        const payload = new CreateTransferOwnerPayload({expected_new_owner: newOwner.toBytes()});
        const serialized = serializeAccount(PayloadSchemas.CreateTransferOwnerSchema, CreateTransferOwnerPayload, payload);
        
        const variant = Buffer.from(Uint8Array.of(InstructionDiscriminator.InitiateOwnerTransfer));
        const data = Buffer.concat([variant, serialized]);
    
        const instruction = new TransactionInstruction({
            keys: [
                { pubkey: payer.publicKey, isSigner: true, isWritable: true },
                { pubkey: pollPda, isSigner: false, isWritable: true },
            ],
            programId: this.programId,
            data
        });
    
        const tx = new Transaction().add(instruction);
        const signature = await this.connection.sendTransaction(tx, [payer]);
        return signature;
    }

    async acceptOwnerTransfer(
        payer: Keypair,
        pollPda: PublicKey,
    ) {
        const data = Buffer.from(Uint8Array.of(InstructionDiscriminator.AcceptOwnerTransfer));

        const instruction = new TransactionInstruction({
            keys: [
                { pubkey: payer.publicKey, isSigner: true, isWritable: true },
                { pubkey: pollPda, isSigner: false, isWritable: true },
            ],
            programId: this.programId,
            data
        });

        const tx = new Transaction().add(instruction);

        try {
            const signature = await this.connection.sendTransaction(tx, [payer]);
            return signature;
        } catch (error) {
            // console.error('Error accepting owner transfer:', error);
            return undefined;
        }
    }

    async vote(
        payer: Keypair,
        pollPda: PublicKey,
        partyPda: PublicKey,
        voteType: number,
    ) {
        const [voterPda] = PdaDerivation.deriveVoterPda(this.programId, pollPda, payer.publicKey);
        const payload = new VotePayload({vote_type: voteType});
        const serialized = serializeAccount(PayloadSchemas.VoteSchema, VotePayload, payload);

        const variant = Buffer.from(Uint8Array.of(InstructionDiscriminator.Vote));
        const data = Buffer.concat([variant, serialized]);

        const instruction = new TransactionInstruction({
            keys: [
                { pubkey: payer.publicKey, isSigner: true, isWritable: true },
                { pubkey: pollPda, isSigner: false, isWritable: false },
                { pubkey: partyPda, isSigner: false, isWritable: true },
                { pubkey: voterPda, isSigner: false, isWritable: true },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            ],
            programId: this.programId,
            data
        });

        const tx = new Transaction().add(instruction);
        try {
            const signature = await this.connection.sendTransaction(tx, [payer]);
            return { signature, voterPda };
        } catch (error) {
            // console.error('Error voting:', error);
            return { signature: undefined, voterPda: undefined };
        }
    }
}