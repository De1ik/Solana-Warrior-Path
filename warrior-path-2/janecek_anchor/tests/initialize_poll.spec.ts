import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, Keypair, LAMPORTS_PER_SOL, Transaction } from "@solana/web3.js";
import { JanecekAnchor } from "../target/types/janecek_anchor";
import * as crypto from "crypto";

import {
    getMint,
    getAssociatedTokenAddress,
    TOKEN_PROGRAM_ID,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    createTransferCheckedInstruction,
    getAssociatedTokenAddressSync,
    createAssociatedTokenAccountInstruction,
    createTransferCheckedWithTransferHookInstruction,
} from "@solana/spl-token";


import { expect } from "chai";

// TOKEN_2022_PROGRAM_ID constant from Solana
// const TOKEN_2022_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

const HOOK_PROGRAM_ID = new PublicKey("DBkCSr6ZXmYzXUecrtBSrzctRJCSdPCXhGpR1DPAx7At");


describe("Janecek-Tests", () => {
    let connection: anchor.web3.Connection;
    let provider: AnchorProvider;
    let wallet: Wallet;
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
    let mintPdaC: PublicKey;
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

        wallet = provider.wallet as anchor.Wallet;

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
        it("creates a new party PDA A without reward", async () => {
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
                .initNonRewardParty(
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
        it("can not create party by non-owner", async () => {
            const creator = pollOwner2;
            const partyTitle = "Party B";
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

            const [mintPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("mint"), pollPda.toBuffer(), partyTitleHash],
                program.programId
            );

            try {
                await program.methods
                .initRewardParty(
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
                    tokenProgram: TOKEN_2022_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                })
                .signers([creator])
                .rpc();
                expect.fail("Party can be created just by the poll owner");
        
            } catch (err: any) {
                const logs = err.logs ?? (err.error?.logs ?? []);
                expect(logs.some((l: string) => l.includes("Unauthorized"))).to.equal(true);
            }

        })
        it("creates a new party PDA B with reward", async () => {
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
                .initRewardParty(
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
                    tokenProgram: TOKEN_2022_PROGRAM_ID,
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

            // Fetch mint Acc from blockchain
            const mintAcc = await getMint(
                connection,
                mintPda,
                "confirmed",
                TOKEN_2022_PROGRAM_ID
            );
            expect(Number(mintAcc.supply)).to.equal(0);
            expect(mintAcc.decimals).to.equal(0);
            expect(mintAcc.mintAuthority?.equals(partyPda)).to.equal(true);
            expect(mintAcc.freezeAuthority).to.equal(null);

            console.log("Reward Party PDA with reward created at:", partyPda.toBase58());
        });
        it("creates a new party PDA C with reward", async () => {
            const creator = pollOwner;
            const partyTitle = "Party C";
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

            partyCPda = partyPda;
            partyTitleHashC = partyTitleHash;


            const [mintPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("mint"), pollPda.toBuffer(), partyTitleHash],
                program.programId
            );

            mintPdaC = mintPda;

            // Call instruction
            const txSignature = await program.methods
                .initRewardParty(
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
                    tokenProgram: TOKEN_2022_PROGRAM_ID,
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
            expect(pollAcc.partyCounter.toNumber()).to.equal(3);

            // Fetch mint Acc from blockchain
            const mintAcc = await getMint(
                connection,
                mintPda,
                "confirmed",
                TOKEN_2022_PROGRAM_ID
            );
            expect(Number(mintAcc.supply)).to.equal(0);
            expect(mintAcc.decimals).to.equal(0);
            expect(mintAcc.mintAuthority?.equals(partyPda)).to.equal(true);
            expect(mintAcc.freezeAuthority).to.equal(null);

            console.log("Reward Party PDA with reward created at:", partyPda.toBase58());
        });
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
            expect(pollAcc.phase).to.deep.equal({ registration: {} });
            expect(pollAcc.partyCounter.toNumber()).to.equal(3);
            expect(pollAcc.owner.toBase58()).to.equal(pollOwner.publicKey.toBase58());
            expect(pollAcc.expectedNewOwner.toBase58()).to.equal(pollOwner2.publicKey.toBase58());
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
            expect(pollAcc.phase).to.deep.equal({ registration: {} });
            expect(pollAcc.partyCounter.toNumber()).to.equal(3);
            expect(pollAcc.owner.toBase58()).to.equal(pollOwner2.publicKey.toBase58());
            expect(pollAcc.expectedNewOwner.toBase58()).to.equal(pollOwner2.publicKey.toBase58());
        })
    })
 
    describe("start-voting", () => {
        it("can not finish voting from registration phase", async () => {
            try {
                await program.methods   
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
                expect.fail("attempt to finish voting should throw NotInVotingPhase error");
        
            } catch (err: any) {
                const logs = err.logs ?? (err.error?.logs ?? []);
                expect(logs.some((l: string) => l.includes("NotInVotingPhase"))).to.equal(true);
            }
        })

        it("can not start voting by non-owner", async () => {
            const owner = pollOwner;

            try {
                await program.methods
                .initVoting(
                    Array.from(pollTitleHash),
                    Array.from(pollDescHash),
                )
                .accountsPartial({
                    owner: owner.publicKey,
                    poll: pollPda
                })
                .rpc();
                expect.fail("can not start voting by non-owner");
        
            } catch (err: any) {
                const logs = err.logs ?? (err.error?.logs ?? []);
                expect(logs.some((l: string) => l.includes("Unauthorized"))).to.equal(true);
            }
        })

        it("successfully start voting", async () => {
            const owner = pollOwner2;
            
            const txSignature = await program.methods
                .initVoting(
                    Array.from(pollTitleHash),
                    Array.from(pollDescHash),
                )
                .accountsPartial({
                    owner: owner.publicKey,
                    poll: pollPda
                })
                .signers([owner])
                .rpc();

            console.log("[start voting] -> TX signature:", txSignature);
            await connection.confirmTransaction(txSignature, "confirmed");

            // Fetch party from blockchain
            const pollAcc = await program.account.pollAccount.fetch(pollPda);

            // Validate creation
            expect(pollAcc.title).to.equal(pollTitle);
            expect(pollAcc.description).to.equal(pollDesc);
            expect(pollAcc.phase).to.deep.equal({ voting: {} });
            expect(pollAcc.partyCounter.toNumber()).to.equal(3);
            expect(pollAcc.owner.toBase58()).to.equal(owner.publicKey.toBase58());
            expect(pollAcc.expectedNewOwner.toBase58()).to.equal(owner.publicKey.toBase58());

            // created_at > 0
            expect(pollAcc.votingStartAt.toNumber()).to.be.greaterThan(0);

            console.log("*** Voting was started ***");

        })
        
        it("can not start voting after it was started", async () => {
            try {
                await program.methods
                .initVoting(
                    Array.from(pollTitleHash),
                    Array.from(pollDescHash),
                )
                .accountsPartial({
                    owner: pollOwner2.publicKey,
                    poll: pollPda
                })
                .signers([pollOwner2])
                .rpc();
                expect.fail("Resrart should throw NotInRegistrationPhase error");
        
            } catch (err: any) {
                const logs = err.logs ?? (err.error?.logs ?? []);
                expect(logs.some((l: string) => l.includes("NotInRegistrationPhase"))).to.equal(true);
            }
        })
    })

    describe("vote", () => {
        it("successfully positive vote for NON-REWARD party A", async () => {
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
            expect(partyAccA.negativeVotes.toNumber()).to.equal(0);
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
        it("can not vote for the same NON-REWARD party A", async () => {
            // Derive Voter PDA
            const [voterPda, _] = PublicKey.findProgramAddressSync(
                [
                    Buffer.from("voter"),
                    pollPda.toBuffer(),
                    voter1.publicKey.toBuffer()
                ],
                program.programId
            );

            try {
                await program.methods
                    .freeVote(
                        Array.from(pollTitleHash),
                        Array.from(pollDescHash),
                        { positive: {} },
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
                expect.fail("Second vote should have thrown AlreadyVoted error");
        
            } catch (err: any) {
                const logs = err.logs ?? (err.error?.logs ?? []);
                expect(logs.some((l: string) => l.includes("AlreadyVoted"))).to.equal(true);
            }

        })
        it("can not use negative vote for NON-REWARD party before all positive votes were used", async () => {
            // Derive Voter PDA
            const [voterPda, _] = PublicKey.findProgramAddressSync(
                [
                    Buffer.from("voter"),
                    pollPda.toBuffer(),
                    voter1.publicKey.toBuffer()
                ],
                program.programId
            );

            try {
                await program.methods
                    .freeVote(
                        Array.from(pollTitleHash),
                        Array.from(pollDescHash),
                        { negative: {} },
                        Array.from(partyTitleHashB),
                    )
                    .accountsPartial({
                        voter: voter1.publicKey,
                        poll: pollPda,
                        party: partyBPda,
                        voterPda,
                        systemProgram: SystemProgram.programId,
                    })
                    .signers([voter1])
                    .rpc();
                expect.fail("negative vote befare all positive votes were used should thrown MustUseAllPositiveVoices error");
        
            } catch (err: any) {
                const logs = err.logs ?? (err.error?.logs ?? []);
                expect(logs.some((l: string) => l.includes("MustUseAllPositiveVoices"))).to.equal(true);
            }

        })
        it("can not use negative vote for REWARD party before all positive votes were used", async () => {

            const voterAta = (await PublicKey.findProgramAddressSync(
                [
                    voter1.publicKey.toBuffer(),
                    TOKEN_2022_PROGRAM_ID.toBuffer(),
                    mintPdaB.toBuffer()
                ],
                ASSOCIATED_TOKEN_PROGRAM_ID
            ))[0]

            try {
                await program.methods 
                    .rewardVote(
                        Array.from(pollTitleHash),
                        Array.from(pollDescHash),
                        {negative: {}},
                        Array.from(partyTitleHashB),
                    )
                    .accountsPartial({
                        voter: voter1.publicKey,
                        poll: pollPda,
                        party: partyBPda,
                        voterPda: voter1Pda,
                        mint: mintPdaB,
                        voterAta,
                        tokenProgram: TOKEN_2022_PROGRAM_ID,
                        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                        systemProgram: SystemProgram.programId,
                    })
                    .signers([voter1])
                    .rpc();
                    expect.fail("negative vote befare all positive votes were used should thrown MustUseAllPositiveVoices error");
            } catch (err: any) {
                    const logs = err.logs ?? (err.error?.logs ?? []);
                    expect(logs.some((l: string) => l.includes("MustUseAllPositiveVoices"))).to.equal(true);
            }
        })
        it("successfully positive vote for REWARD party B", async () => {
            const [voterPda, _] = PublicKey.findProgramAddressSync(
                [
                    Buffer.from("voter"),
                    pollPda.toBuffer(),
                    voter1.publicKey.toBuffer()
                ],
                program.programId
            );

            voter1Pda = voterPda;

            const voterAta = getAssociatedTokenAddressSync(
                mintPdaB,
                voter1.publicKey,
                false,
                TOKEN_2022_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID
            );

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
                    tokenProgram: TOKEN_2022_PROGRAM_ID,
                    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                })
                .signers([voter1])
                .rpc();

            console.log("[vote reward party] -> TX signature:", txSignature);
            await connection.confirmTransaction(txSignature, "confirmed");

            // const txDetails = await program.provider.connection.getTransaction(txSignature, {
            //     commitment: "confirmed",
            //     maxSupportedTransactionVersion: 0,
            // });

            // console.log("*".repeat(200));
            // console.log("Program logs:", txDetails.meta.logMessages);
            // console.log("*".repeat(200));

            // Fetch party from blockchain
            const partyAccB = await program.account.partyAccount.fetch(partyBPda);
            expect(partyAccB.rewardEnabled).to.equal(true);
            expect(partyAccB.positiveVotes.toNumber()).to.equal(1);
            expect(partyAccB.negativeVotes.toNumber()).to.equal(0);
            expect(partyAccB.mintAddress.toBase58()).to.equal(mintPdaB.toBase58());

            // Fetch party from blockchain
            const voterAcc = await program.account.voterAccount.fetch(voter1Pda);
            const votedParties = voterAcc.votedParties.map((bytes) => new PublicKey(bytes));
            expect(voterAcc.initialized).to.equal(true);
            expect(voterAcc.positiveUsed).to.equal(2);
            expect(voterAcc.negativeUsed).to.equal(0);
            expect(votedParties.some((pk) => pk.equals(partyAPda))).to.equal(true);
            expect(votedParties.some((pk) => pk.equals(partyBPda))).to.equal(true);

            const balance = await connection.getTokenAccountBalance(voterAta);
            expect(Number(balance.value.amount)).to.equal(1);

            // Fetch mint Acc from blockchain
            const mintAcc = await getMint(
                connection,
                mintPdaB,
                "confirmed",
                TOKEN_2022_PROGRAM_ID
            );
            expect(Number(mintAcc.supply)).to.equal(1);
            expect(mintAcc.decimals).to.equal(0);
            expect(mintAcc.mintAuthority?.equals(partyBPda)).to.equal(true);
            expect(mintAcc.freezeAuthority).to.equal(null);

        })
        it("can not vote for the same REWARD party B", async () => {

            const voterAta = (await PublicKey.findProgramAddressSync(
                [
                    voter1.publicKey.toBuffer(),
                    TOKEN_2022_PROGRAM_ID.toBuffer(),
                    mintPdaB.toBuffer()
                ],
                ASSOCIATED_TOKEN_PROGRAM_ID
            ))[0]

            try {
                await program.methods 
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
                        tokenProgram: TOKEN_2022_PROGRAM_ID,
                        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                        systemProgram: SystemProgram.programId,
                    })
                    .signers([voter1])
                    .rpc();
                    expect.fail("Second vote should have thrown AlreadyVoted error");
            } catch (err: any) {
                    const logs = err.logs ?? (err.error?.logs ?? []);
                    expect(logs.some((l: string) => l.includes("AlreadyVoted"))).to.equal(true);
            }
        })
        it("successfully negative vote for reward party C", async () => {

            const voterAta = (await PublicKey.findProgramAddressSync(
                [
                    voter1.publicKey.toBuffer(),
                    TOKEN_2022_PROGRAM_ID.toBuffer(),
                    mintPdaC.toBuffer()
                ],
                ASSOCIATED_TOKEN_PROGRAM_ID
            ))[0]

            const txSignature = await program.methods 
                .rewardVote(
                    Array.from(pollTitleHash),
                    Array.from(pollDescHash),
                    {negative: {}},
                    Array.from(partyTitleHashC),
                )
                .accountsPartial({
                    voter: voter1.publicKey,
                    poll: pollPda,
                    party: partyCPda,
                    voterPda: voter1Pda,
                    mint: mintPdaC,
                    voterAta,
                    tokenProgram: TOKEN_2022_PROGRAM_ID,
                    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                })
                .signers([voter1])
                .rpc();

            console.log("[vote reward party] -> TX signature:", txSignature);
            await connection.confirmTransaction(txSignature, "confirmed");

            // Fetch party from blockchain
            const partyAccC = await program.account.partyAccount.fetch(partyCPda);
            expect(partyAccC.rewardEnabled).to.equal(true);
            expect(partyAccC.positiveVotes.toNumber()).to.equal(0);
            expect(partyAccC.negativeVotes.toNumber()).to.equal(1);
            expect(partyAccC.mintAddress.toBase58()).to.equal(mintPdaC.toBase58());

            // Fetch voter from blockchain
            const voterAcc = await program.account.voterAccount.fetch(voter1Pda);
            const votedParties = voterAcc.votedParties.map((bytes) => new PublicKey(bytes));
            expect(voterAcc.initialized).to.equal(true);
            expect(voterAcc.positiveUsed).to.equal(2);
            expect(voterAcc.negativeUsed).to.equal(1);
            expect(votedParties.some((pk) => pk.equals(partyAPda))).to.equal(true);
            expect(votedParties.some((pk) => pk.equals(partyBPda))).to.equal(true);
            expect(votedParties.some((pk) => pk.equals(partyCPda))).to.equal(true);

            // Fetch мщеу ATA from blockchain
            const ataAcc = await connection.getAccountInfo(voterAta);
            expect(ataAcc).to.be.null;

            // Fetch mint Acc from blockchain
            const mintAcc = await getMint(
                connection,
                mintPdaC,
                "confirmed",
                TOKEN_2022_PROGRAM_ID
            );
            expect(Number(mintAcc.supply)).to.equal(0);
            expect(mintAcc.decimals).to.equal(0);
            expect(mintAcc.mintAuthority?.equals(partyCPda)).to.equal(true);
            expect(mintAcc.freezeAuthority).to.equal(null);

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
                expect(pollAcc.partyCounter.toNumber()).to.equal(3);
                expect(pollAcc.owner.toBase58()).to.equal(pollOwner2.publicKey.toBase58());
                expect(pollAcc.expectedNewOwner.toBase58()).to.equal(pollOwner2.publicKey.toBase58());

                // created_at > 0
                expect(pollAcc.votingStartAt.toNumber()).to.be.greaterThan(0);
        })

        it("can not close voting again", async () => {
            try {
                await program.methods   
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
                expect.fail("attempt to finish voting should throw NotInVotingPhase error");
        
            } catch (err: any) {
                const logs = err.logs ?? (err.error?.logs ?? []);
                expect(logs.some((l: string) => l.includes("NotInVotingPhase"))).to.equal(true);
            }
        })
       
        it("can not start voting after it was closed", async () => {
            try {
                await program.methods
                .initVoting(
                    Array.from(pollTitleHash),
                    Array.from(pollDescHash),
                )
                .accountsPartial({
                    owner: pollOwner2.publicKey,
                    poll: pollPda
                })
                .signers([pollOwner2])
                .rpc();
                expect.fail("Restart should throw NotInRegistrationPhase error");

            } catch (err: any) {
                const logs = err.logs ?? (err.error?.logs ?? []);
                expect(logs.some((l: string) => l.includes("NotInRegistrationPhase"))).to.equal(true);
            }
        })
    })

    describe("test-transfer-hook", () => {
        it("should trigger transfer hook on token transfer", async () => {
            // Sender token account address
            const voterAta = getAssociatedTokenAddressSync(
                mintPdaB,
                voter1.publicKey,
                false,
                TOKEN_2022_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID
            );

            // Recipient token account address
            const recipientAta = getAssociatedTokenAddressSync(
                mintPdaB,
                voter2.publicKey,
                false,
                TOKEN_2022_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID
            );

            const inst = await createAssociatedTokenAccountInstruction(
                voter2.publicKey,
                recipientAta,
                voter2.publicKey,
                mintPdaB,
                TOKEN_2022_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID
            );

            await program.provider.sendAndConfirm(
                new Transaction().add(inst),
                [voter2]
            );

            // let info = await connection.getAccountInfo(voterAta);
            // console.log("voterAta owner =", info.owner.toBase58());

            // info = await connection.getAccountInfo(mintPdaB);
            // console.log("mint owner =", info.owner.toBase58());

            // info = await connection.getAccountInfo(recipientAta);
            // console.log("voterAta owner =", info.owner.toBase58());

            const bigIntAmount = BigInt(1);

            const ix = createTransferCheckedInstruction(
                voterAta,
                mintPdaB,
                recipientAta,
                voter1.publicKey,
                bigIntAmount,
                0,
                [],                      
                TOKEN_2022_PROGRAM_ID
            );

            ix.keys.push({
                pubkey: HOOK_PROGRAM_ID,
                isSigner: false,
                isWritable: false
            });

            const transferSig = await program.provider.sendAndConfirm(
                new Transaction().add(ix),
                [voter1],
            );

            await connection.confirmTransaction(transferSig, "confirmed");

            const tx = await connection.getTransaction(transferSig, {
                commitment: "confirmed",
                maxSupportedTransactionVersion: 0,
            });

            console.log("TX:", tx)

            const logs = tx.meta.logMessages;
            console.log(logs.join("\n"));

            expect(
                logs.some((l) => l.includes("Hello Transfer Hook"))
            ).to.equal(true);
        });
    })
});
