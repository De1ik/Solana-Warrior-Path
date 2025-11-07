import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { JanecekAnchor } from "../target/types/janecek_anchor";
import * as crypto from "crypto";

import {
    getAssociatedTokenAddress,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";


import { expect } from "chai";

// TOKEN_PROGRAM_ID constant from Solana
// const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");



describe("Janecek-Tests", () => {
    let connection: anchor.web3.Connection;
    let provider: AnchorProvider;
    let program: Program<JanecekAnchor>;

    let pollOwner: Keypair;
    let pollOwner2: Keypair;
    let voter1: Keypair;
    let voter2: Keypair;
    let randomUser: Keypair;
    let mint2Keypair: Keypair;
    let voter1Pda: PublicKey;
    let voter2Pda: PublicKey;
    let programId: PublicKey;
    let pollPda: PublicKey;
    let pollTitle: string;
    let pollDesc: string;
    let pollTitleHash: Buffer;
    let pollDescHash: Buffer;
    let partyAPda: PublicKey;
    let partyTitleHashA: Buffer;
    let mintPdaB: PublicKey;
    let partyBPda: PublicKey;
    let partyTitleHashB: Buffer;
    let partyCPda: PublicKey;
    let partyTitleHashC: Buffer;
    let randomSeed: String;

    const airdropIfNeeded = async (pubkey: PublicKey, minBalance = 2 * LAMPORTS_PER_SOL) => {
        const current = await connection.getBalance(pubkey);
        if (current >= minBalance) {
            return;
        }
        const sig = await connection.requestAirdrop(pubkey, minBalance - current);
        await connection.confirmTransaction(sig, "confirmed");
    };

    before(async () => {
        // keypairs
        const pollOwnerSecretKey = Uint8Array.from([
            247,36,106,22,39,76,62,197,230,8,113,75,154,95,37,51,187,186,216,176,173,0,249,185,32,110,230,135,130,12,184,16,107,234,23,232,41,105,199,57,189,47,183,97,40,128,235,80,77,50,33,220,150,222,190,179,180,181,70,156,104,131,239,72
        ]);
        const pollOwner2SecretKey = Uint8Array.from([
            196,10,11,138,51,134,83,180,150,200,65,211,99,82,74,76,92,188,103,116,50,75,79,1,253,33,123,196,143,148,158,133,3,29,155,23,115,161,166,23,230,17,74,6,244,173,134,207,72,30,135,248,210,15,149,225,164,242,18,131,31,4,75,239
        ]);
        const voter1SecretKey = Uint8Array.from([
            10,138,138,97,132,127,91,200,110,1,95,148,206,157,13,170,95,62,187,244,45,184,9,8,212,131,114,83,77,6,30,32,229,28,194,232,97,180,125,39,233,77,253,19,206,199,94,67,12,91,49,225,197,116,157,108,23,153,140,196,243,217,142,220
        ]);
        const voter2SecretKey = Uint8Array.from([
            74,200,229,217,245,28,42,83,171,209,146,172,226,191,14,196,32,115,53,123,33,136,66,35,77,134,42,223,87,129,250,127,235,50,47,68,165,138,3,241,197,115,34,78,64,243,233,128,78,178,107,9,62,63,184,122,49,58,119,202,84,180,142,55
        ]);
        pollOwner = Keypair.fromSecretKey(pollOwnerSecretKey);
        pollOwner2 = Keypair.fromSecretKey(pollOwner2SecretKey);
        voter1 = Keypair.fromSecretKey(voter1SecretKey);
        voter2 = Keypair.fromSecretKey(voter2SecretKey);
        
        // Generate deterministic mint keypairs from seeds
        const mint1Seed = crypto.createHash("sha256").update("mint1").digest();
        const mint2Seed = crypto.createHash("sha256").update("mint2").digest();
        randomUser = Keypair.fromSeed(mint1Seed);
        mint2Keypair = Keypair.fromSeed(mint2Seed);

        randomSeed = Keypair.generate().publicKey.toString();

        // default local provider for connection/options.
        const defaultProvider = AnchorProvider.local();
        connection = defaultProvider.connection;

        // Override the wallet with custom poll owner keypair.
        provider = new AnchorProvider(
            connection,
            new Wallet(pollOwner),
            defaultProvider.opts
        );
        anchor.setProvider(provider);

        program = anchor.workspace.JanecekAnchor as Program<JanecekAnchor>;

        // Ensure custom keypairs have lamports.
        await Promise.all([
            airdropIfNeeded(pollOwner.publicKey),
            airdropIfNeeded(pollOwner2.publicKey),
            airdropIfNeeded(voter1.publicKey),
            airdropIfNeeded(voter2.publicKey),
            airdropIfNeeded(randomUser.publicKey, 2 * LAMPORTS_PER_SOL),
            airdropIfNeeded(mint2Keypair.publicKey, 2 * LAMPORTS_PER_SOL),
        ]);

        console.log("Poll Owner:", pollOwner.publicKey.toString());
        console.log("Poll Owner Balance:", await connection.getBalance(pollOwner.publicKey));
        console.log("Poll Owner 2:", pollOwner2.publicKey.toString());
        console.log("Poll Owner 2 Balance:", await connection.getBalance(pollOwner2.publicKey));
        console.log("Voter 1:", voter1.publicKey.toString());
        console.log("Voter 1 Balance:", await connection.getBalance(voter1.publicKey));
        console.log("Voter 2:", voter2.publicKey.toString());
        console.log("Voter 2 Balance:", await connection.getBalance(voter2.publicKey));
        console.log("Random User:", randomUser.publicKey.toString());
        console.log("random User Balance:", await connection.getBalance(randomUser.publicKey));
        console.log("Mint 2:", mint2Keypair.publicKey.toString());
        console.log("Mint 2 Balance:", await connection.getBalance(mint2Keypair.publicKey));
    });


    describe("poll-creation", () => {
        it("creates a new poll PDA", async () => {
            const creator = pollOwner;
            pollTitle = "Test Poll";
            pollDesc = "This is a test poll description" + randomSeed;

            // Compute hash
            pollTitleHash = crypto.createHash("sha256").update(pollTitle).digest();
            pollDescHash = crypto.createHash("sha256").update(pollDesc).digest();

            // Derive PDA
            [pollPda] = PublicKey.findProgramAddressSync(
            [
                Buffer.from("poll"),
                pollTitleHash, 
                pollDescHash, 
            ],
            program.programId
            );

            // Call instruction
            const txSignature = await program.methods
            .initPoll(
                pollTitle,
                pollDesc,
                Array.from(pollTitleHash), 
                Array.from(pollDescHash)
            )
            .accountsPartial({
                creator: creator.publicKey,
                poll: pollPda,
                systemProgram: SystemProgram.programId 
            })
            .rpc();

            console.log("[init poll] -> TX signature:", txSignature);

            await connection.confirmTransaction(txSignature, "confirmed");

            // const txDetails = await program.provider.connection.getTransaction(txSignature, {
            //     commitment: "confirmed",
            //     maxSupportedTransactionVersion: 0,
            // });

            // console.log("Program logs:", txDetails.meta.logMessages);

            // Fetch poll from blockchain
            const pollAcc = await program.account.pollAccount.fetch(pollPda);

            // Validate creation
            expect(pollAcc.title).to.equal(pollTitle);
            expect(pollAcc.description).to.equal(pollDesc);
            expect(pollAcc.phase).to.deep.equal({ registration: {} });
            expect(pollAcc.partyCounter.toNumber()).to.equal(0);
            expect(pollAcc.owner.toBase58()).to.equal(creator.publicKey.toBase58());
            expect(pollAcc.expectedNewOwner.toBase58()).to.equal(creator.publicKey.toBase58());

            // created_at > 0
            expect(pollAcc.createdAt.toNumber()).to.be.greaterThan(0);

            console.log("Poll PDA created at:", pollPda.toBase58());
        });
    })

    describe("party-creation", () => { 
        it("creates a new party PDA without reward", async () => {
            const creator = pollOwner;
            const partyTitle = "Party A";
            const rewardEnabled = false;

            // Compute party title hash
            const partyTitleHash = crypto.createHash("sha256").update(partyTitle, "utf8").digest();

            // Derive Party PDA
            const [partyPda, partyBump] = PublicKey.findProgramAddressSync(
                [
                    Buffer.from("party"),
                    pollPda.toBuffer(),
                    partyTitleHash
                ],
                program.programId
            );

            partyAPda = partyPda;
            partyTitleHashA = partyTitleHash;

            const [mintPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("mint"), pollPda.toBuffer(), partyTitleHash],
                program.programId
            );

            // Call instruction
            const txSignature = await program.methods
                .initParty(
                    partyTitle,
                    Array.from(partyTitleHash),
                    Array.from(pollTitleHash),
                    Array.from(pollDescHash),
                    rewardEnabled
                )
                .accountsPartial({
                    creator: creator.publicKey,
                    poll: pollPda,
                    party: partyPda,
                    mint: mintPda,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();

            console.log("[create non reward party] -> TX signature:", txSignature);
            await connection.confirmTransaction(txSignature, "confirmed");

            // Fetch party from blockchain
            const partyAcc = await program.account.partyAccount.fetch(partyPda);

            // Validate creation
            expect(partyAcc.title).to.equal(partyTitle);
            expect(partyAcc.pollAddress.toBase58()).to.equal(pollPda.toBase58());
            expect(partyAcc.rewardEnabled).to.equal(false);
            expect(partyAcc.positiveVotes.toNumber()).to.equal(0);
            expect(partyAcc.negativeVotes.toNumber()).to.equal(0);
            expect(partyAcc.mintAddress).to.be.null;
            expect(partyAcc.bump).to.equal(partyBump);

            // Verify poll counter increased
            const pollAcc = await program.account.pollAccount.fetch(pollPda);
            expect(pollAcc.partyCounter.toNumber()).to.equal(1);

            console.log("Non-reward Party PDA created at:", partyPda.toBase58());
        });

        it("creates a new party PDA with reward", async () => {
            const creator = pollOwner;
            const partyTitle = "Party B";
            const rewardEnabled = true;

            // Compute party title hash
            const partyTitleHash = crypto.createHash("sha256").update(partyTitle, "utf8").digest();

            // Derive Party PDA
            const [partyPda, partyBump] = PublicKey.findProgramAddressSync(
                [
                    Buffer.from("party"),
                    pollPda.toBuffer(),
                    partyTitleHash
                ],
                program.programId
            );

            partyBPda = partyPda;
            partyTitleHashB = partyTitleHash;


            const [mintPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("mint"), pollPda.toBuffer(), partyTitleHash],
                program.programId
            );

            mintPdaB = mintPda;

            // Call instruction
            const txSignature = await program.methods
                .initParty(
                    partyTitle,
                    Array.from(partyTitleHash),
                    Array.from(pollTitleHash),
                    Array.from(pollDescHash),
                    rewardEnabled
                )
                .accountsPartial({
                    creator: creator.publicKey,
                    poll: pollPda,
                    party: partyPda,
                    mint: mintPda,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();

            console.log("[init party with reward] -> TX signature:", txSignature);

            await connection.confirmTransaction(txSignature, "confirmed");

            // Fetch party from blockchain
            const partyAcc = await program.account.partyAccount.fetch(partyPda);

            // Validate creation
            expect(partyAcc.title).to.equal(partyTitle);
            expect(partyAcc.pollAddress.toBase58()).to.equal(pollPda.toBase58());
            expect(partyAcc.rewardEnabled).to.equal(true);
            expect(partyAcc.positiveVotes.toNumber()).to.equal(0);
            expect(partyAcc.negativeVotes.toNumber()).to.equal(0);
            expect(partyAcc.mintAddress).to.not.be.null;
            expect(partyAcc.mintAddress?.toBase58()).to.equal(mintPda.toBase58());
            expect(partyAcc.bump).to.equal(partyBump);

            // Verify poll counter increased
            const pollAcc = await program.account.pollAccount.fetch(pollPda);
            expect(pollAcc.partyCounter.toNumber()).to.equal(2);

            console.log("Reward Party PDA with reward created at:", partyPda.toBase58());
        });
    })
 
    describe("start-voting", () => {
        it("successfully start voting", async () => {
            const owner = pollOwner;
            
            const txSignature = await program.methods
                .initVoting(
                    Array.from(pollTitleHash),
                    Array.from(pollDescHash),
                )
                .accountsPartial({
                    owner: owner.publicKey,
                    poll: pollPda
                })
                .rpc();

            console.log("[start voting] -> TX signature:", txSignature);
            await connection.confirmTransaction(txSignature, "confirmed");

            // Fetch party from blockchain
            const pollAcc = await program.account.pollAccount.fetch(pollPda);

            // Validate creation
            expect(pollAcc.title).to.equal(pollTitle);
            expect(pollAcc.description).to.equal(pollDesc);
            expect(pollAcc.phase).to.deep.equal({ voting: {} });
            expect(pollAcc.partyCounter.toNumber()).to.equal(2);
            expect(pollAcc.owner.toBase58()).to.equal(owner.publicKey.toBase58());
            expect(pollAcc.expectedNewOwner.toBase58()).to.equal(owner.publicKey.toBase58());

            // created_at > 0
            expect(pollAcc.votingStartAt.toNumber()).to.be.greaterThan(0);

            console.log("*** Voting was started ***");

        })
    })

    describe("vote", () => {
        it("successfully vote for non reward party", async () => {
            // Derive Voter PDA
            const [voterPda, _] = PublicKey.findProgramAddressSync(
                [
                    Buffer.from("voter"),
                    pollPda.toBuffer(),
                    voter1.publicKey.toBuffer()
                ],
                program.programId
            );

            voter1Pda = voterPda;

            const txSignature = await program.methods 
                .freeVote(
                    Array.from(pollTitleHash),
                    Array.from(pollDescHash),
                    {positive: {}},
                    Array.from(partyTitleHashA),
                )
                .accountsPartial({
                    voter: voter1.publicKey,
                    poll: pollPda,
                    party: partyAPda,
                    voterPda,
                    systemProgram: SystemProgram.programId,
                })
                .signers([voter1])
                .rpc();

            console.log("[vote non reward party] -> TX signature:", txSignature);
            await connection.confirmTransaction(txSignature, "confirmed");

            // Fetch party from blockchain
            const partyAccA = await program.account.partyAccount.fetch(partyAPda);
            
            expect(partyAccA.positiveVotes.toNumber()).to.equal(1);
            expect(partyAccA.mintAddress).to.be.null;

            // Fetch party from blockchain
            const voterAcc = await program.account.voterAccount.fetch(voterPda);
            expect(voterAcc.initialized).to.equal(true);
            expect(voterAcc.positiveUsed).to.equal(1);
            expect(voterAcc.negativeUsed).to.equal(0);

            const votedParties = voterAcc.votedParties.map(
                (bytes) => new PublicKey(bytes)
            );
            expect(
                votedParties.some((pk) => pk.equals(partyAPda))
            ).to.equal(true);

        })
        it("successfully vote for reward party", async () => {

            const voterAta = (await PublicKey.findProgramAddressSync(
                [
                    voter1.publicKey.toBuffer(),
                    TOKEN_PROGRAM_ID.toBuffer(),
                    mintPdaB.toBuffer()
                ],
                ASSOCIATED_TOKEN_PROGRAM_ID
            ))[0]

            const txSignature = await program.methods 
                .rewardVote(
                    Array.from(pollTitleHash),
                    Array.from(pollDescHash),
                    {positive: {}},
                    Array.from(partyTitleHashB),
                )
                .accountsPartial({
                    voter: voter1.publicKey,
                    poll: pollPda,
                    party: partyBPda,
                    voterPda: voter1Pda,
                    mint: mintPdaB,
                    voterAta,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                })
                .signers([voter1])
                .rpc();

            console.log("[vote reward party] -> TX signature:", txSignature);
            await connection.confirmTransaction(txSignature, "confirmed");

            // Fetch party from blockchain
            const partyAccB = await program.account.partyAccount.fetch(partyBPda);
            expect(partyAccB.rewardEnabled).to.equal(true);
            expect(partyAccB.positiveVotes.toNumber()).to.equal(1);
            expect(partyAccB.mintAddress.toBase58()).to.equal(mintPdaB.toBase58());

            // Fetch party from blockchain
            const voterAcc = await program.account.voterAccount.fetch(voter1Pda);
            const votedParties = voterAcc.votedParties.map((bytes) => new PublicKey(bytes));
            expect(voterAcc.initialized).to.equal(true);
            expect(voterAcc.positiveUsed).to.equal(2);
            expect(voterAcc.negativeUsed).to.equal(0);
            expect(votedParties.some((pk) => pk.equals(partyBPda))).to.equal(true);

            const balance = await connection.getTokenAccountBalance(voterAta);
            expect(Number(balance.value.amount)).to.equal(1);
        })
    })

    describe("close-voting", () => {
        it("successfully close the voting", async () => {

            const txSignature = await program.methods   
                .finishVoting(
                    Array.from(pollTitleHash),
                    Array.from(pollDescHash),
                )
                .accountsPartial({
                    anyone: randomUser.publicKey,
                    poll: pollPda
                })
                .signers([randomUser]) 
                .rpc();

                console.log("[close voting] -> TX signature:", txSignature);
                await connection.confirmTransaction(txSignature, "confirmed");
                
                // Fetch party from blockchain
                const pollAcc = await program.account.pollAccount.fetch(pollPda);

                // Validate creation
                expect(pollAcc.title).to.equal(pollTitle);
                expect(pollAcc.description).to.equal(pollDesc);
                expect(pollAcc.phase).to.deep.equal({ results: {} });
                expect(pollAcc.partyCounter.toNumber()).to.equal(2);
                expect(pollAcc.owner.toBase58()).to.equal(pollOwner.publicKey.toBase58());
                expect(pollAcc.expectedNewOwner.toBase58()).to.equal(pollOwner.publicKey.toBase58());

                // created_at > 0
                expect(pollAcc.votingStartAt.toNumber()).to.be.greaterThan(0);

                console.log("*** Voting was closed ***");


        })
    })

    describe("init-owner-transfer", () => {
        it("successfully init owner transfer", async () => {
            const txSignature = await program.methods
                .initOwnerTransfer(
                    Array.from(pollTitleHash),
                    Array.from(pollDescHash),
                    pollOwner2.publicKey
                )
                .accountsPartial({
                    owner: pollOwner.publicKey,
                    poll: pollPda
                })
                .rpc();

            console.log("[init owner transfer] -> TX signature:", txSignature);
            await connection.confirmTransaction(txSignature, "confirmed");

            // Fetch party from blockchain
            const pollAcc = await program.account.pollAccount.fetch(pollPda);

            // Validate creation
            expect(pollAcc.title).to.equal(pollTitle);
            expect(pollAcc.description).to.equal(pollDesc);
            expect(pollAcc.phase).to.deep.equal({ results: {} });
            expect(pollAcc.partyCounter.toNumber()).to.equal(2);
            expect(pollAcc.owner.toBase58()).to.equal(pollOwner.publicKey.toBase58());
            expect(pollAcc.expectedNewOwner.toBase58()).to.equal(pollOwner2.publicKey.toBase58());

            console.log("*** Init owner transfer ***");
            
        })
    })

    describe("accept-owner-transfer", () => {
        it("successfully accept owner transfer", async () => {
            const txSignature = await program.methods
                .acceptOwner(
                    Array.from(pollTitleHash),
                    Array.from(pollDescHash),
                )
                .accountsPartial({
                    expectedOwner: pollOwner2.publicKey,
                    poll: pollPda
                })
                .signers([pollOwner2])
                .rpc();

            console.log("[accept owner transfer] -> TX signature:", txSignature);
            await connection.confirmTransaction(txSignature, "confirmed");

            // Fetch party from blockchain
            const pollAcc = await program.account.pollAccount.fetch(pollPda);

            // Validate creation
            expect(pollAcc.title).to.equal(pollTitle);
            expect(pollAcc.description).to.equal(pollDesc);
            expect(pollAcc.phase).to.deep.equal({ results: {} });
            expect(pollAcc.partyCounter.toNumber()).to.equal(2);
            expect(pollAcc.owner.toBase58()).to.equal(pollOwner2.publicKey.toBase58());
            expect(pollAcc.expectedNewOwner.toBase58()).to.equal(pollOwner2.publicKey.toBase58());

            console.log("*** Accept owner transfer started ***");
            
        })
    })
});
