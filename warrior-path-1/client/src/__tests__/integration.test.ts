import { 
  Connection, 
  Keypair, 
  PublicKey, 
  clusterApiUrl,
} from '@solana/web3.js';
import { getPollState } from '../services/pollService'
import { VotingPhase } from '../types/VotingPhase';
import { deserializePollState } from '../utils/deserialize';
import { createAccountDeserializer } from '../services/accountService';
import { TransactionService } from '../services/TransactionService';
import { getAllPartiesForPoll } from '../utils/getParties';
import { generateKey, generateKeyPair } from 'crypto';
import { VoteType } from '../types/VoteType';

jest.setTimeout(50000);

describe('Janecek Voting Tests', () => {
  let connection: Connection;
  let transactionService: TransactionService;
  let pollOwner: Keypair;
  let pollOwner2: Keypair;
  let voter1: Keypair;
  let voter2: Keypair;
  let voter1Pda: PublicKey;
  let voter2Pda: PublicKey;
  let programId: PublicKey;
  let pollPda: PublicKey;
  let partyAPda: PublicKey;
  let partyBPda: PublicKey;
  let partyCPda: PublicKey;
  let randomSeed: String;

  beforeAll(async () => {
    connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

    // program ID
    programId = new PublicKey('4tdkaWkV9UoGr3qzpDYQdyBSN3eA4EqKJjhfz3Q7ADkF');

    transactionService = new TransactionService(programId, connection);

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

    randomSeed = Keypair.generate().publicKey.toString()

    // Fund accounts (you'll need to fund these manually or use airdrop)
    console.log('Poll Owner:', pollOwner.publicKey.toString());
    console.log('Poll Owner Balance:', await connection.getBalance(pollOwner.publicKey));
    console.log('Poll Owner 2:', pollOwner2.publicKey.toString());
    console.log('Poll Owner 2 Balance:', await connection.getBalance(pollOwner2.publicKey));
    console.log('Voter 1:', voter1.publicKey.toString());
    console.log('Voter 1 Balance:', await connection.getBalance(voter1.publicKey));
    console.log('Voter 2:', voter2.publicKey.toString());
    console.log('Voter 2 Balance:', await connection.getBalance(voter2.publicKey));
  });

  describe('Poll Creation and Management', () => {

    test('should create a poll successfully', async () => {

      const { pollPda: createdPollPda, signature } = await transactionService.createPoll(
        pollOwner,
        'Integration Test Poll ' + randomSeed,
        'Testing the complete voting system functionality'
      ); 
      await connection.confirmTransaction(signature, "confirmed");

      
      pollPda = createdPollPda;
      expect(pollPda).toBeInstanceOf(PublicKey);
      expect(signature).toBeDefined();
      
      console.log('Poll created with signature:', signature);
    });

    test('should retrieve poll state after creation', async () => {
      const deserializer = createAccountDeserializer(connection);
      const pollState = await deserializer.getPollState(pollPda);
      
      expect(pollState).toBeDefined();
      expect(new PublicKey(pollState!.owner).toString()).toBe(pollOwner.publicKey.toString());
      expect(pollState!.title).toBe('Integration Test Poll ' + randomSeed);
      expect(pollState!.description).toBe('Testing the complete voting system functionality');
      expect(pollState!.getVotingPhase()).toBe(VotingPhase.Registration);
      expect(pollState!.getOwnerPubkey().toString()).toBe(pollOwner.publicKey.toString());
      expect(pollState!.party_counter).toBe(0);
    });

    test('should create parties successfully', async () => {
      const { partyPda: createdPartyAPda, signature: signatureA } = await transactionService.createParty(
        pollOwner,
        pollPda,
        'Democratic Party'
      );
      await connection.confirmTransaction(signatureA, "confirmed");
      
      const { partyPda: createdPartyBPda, signature: signatureB } = await transactionService.createParty(
        pollOwner,
        pollPda,
        'Republican Party'
      );
      await connection.confirmTransaction(signatureB, "confirmed");

      const { partyPda: createdPartyCPda, signature: signatureC } = await transactionService.createParty(
        pollOwner,
        pollPda,
        'Independent Party'
      );
      await connection.confirmTransaction(signatureC, "confirmed");
      
      partyAPda = createdPartyAPda;
      partyBPda = createdPartyBPda;
      partyCPda = createdPartyCPda;
      expect(partyAPda).toBeInstanceOf(PublicKey);
      expect(partyBPda).toBeInstanceOf(PublicKey);
      expect(partyCPda).toBeInstanceOf(PublicKey);
      expect(signatureA).toBeDefined();
      expect(signatureB).toBeDefined();
      expect(signatureC).toBeDefined();
      
      console.log('Party A created with signature:', signatureA);
      console.log('Party B created with signature:', signatureB);
      console.log('Party C created with signature:', signatureC);
    });

    test('should retrieve party accounts', async () => {

      const deserializer = createAccountDeserializer(connection);
      const partyA = await deserializer.getPartyAccount(partyAPda);
      const partyB = await deserializer.getPartyAccount(partyBPda);
      
      expect(partyA).toBeDefined();
      expect(partyA!.getPollIdPubkey().toString()).toBe(pollPda.toString());
      expect(partyA!.title).toBe('Democratic Party');
      expect(partyA!.positive_votes).toBe(0);
      expect(partyA!.negative_votes).toBe(0);
      
      expect(partyB).toBeDefined();
      expect(partyB!.getPollIdPubkey().toString()).toBe(pollPda.toString());
      expect(partyB!.title).toBe('Republican Party');
      expect(partyB!.positive_votes).toBe(0);
      expect(partyB!.negative_votes).toBe(0);
    });

    test('should get all parties for the poll', async () => {
      const parties = await getAllPartiesForPoll(connection, pollPda);

      expect(parties).toHaveLength(3);

      const titles = parties.map(p => p.account.title);
      const pubkeys = parties.map(p => p.pubkey.toString());

      expect(titles).toContain('Democratic Party');
      expect(titles).toContain('Republican Party');
      expect(titles).toContain('Independent Party');
      expect(pubkeys).toContain(partyAPda.toString());
      expect(pubkeys).toContain(partyBPda.toString());
      expect(pubkeys).toContain(partyCPda.toString());
    });
  });

  describe('Voting Phase Management', () => {
    test('should start voting phase', async () => {
    //   const failedSignature = await transactionService.startVoting(pollOwner, pollPda);
    //   expect(failedSignature).toBeUndefined();
        
      await new Promise(resolve => setTimeout(resolve, 3000));
        
      const signature = await transactionService.startVoting(pollOwner, pollPda);
      await connection.confirmTransaction(signature!, "confirmed");

      expect(signature).toBeDefined();
      console.log('Voting started. Transaction signature:', signature);
    }, 20000);

    test('should retrieve updated poll state', async () => {
      const deserializer = createAccountDeserializer(connection);
      const pollState = await deserializer.getPollState(pollPda);
      
      expect(pollState).toBeDefined();
      expect(pollState!.phase).toBe(VotingPhase.Voting);
      expect(pollState!.voting_start_at).toBeGreaterThan(0);
    });
  });

  describe('Voting Functionality', () => {

    test('should not allow voter1 to use negative vote', async () => {
        // Vote negative for Party A (not allowed -> expect 2 positive voices first
        const { signature: signature1, voterPda: voterPda1 } = await transactionService.vote(voter1, pollPda, partyAPda, VoteType.Negative);
        expect(signature1).toBeUndefined();
        expect(voterPda1).toBeUndefined();
    });

    test('should allow voter1 to use first positive vote', async () => {
        // Vote positive for Party A (first vote)
        const { signature: signature1, voterPda: voterPda1 } = await transactionService.vote(voter1, pollPda, partyAPda, VoteType.Positive);
        await connection.confirmTransaction(signature1!, "confirmed");
        voter1Pda = voterPda1!;
        
        expect(voter1Pda).toBeDefined();
        expect(signature1).toBeDefined();

        const deserializer = createAccountDeserializer(connection);
        const partyA = await deserializer.getPartyAccount(partyAPda);
        const voter1state = await deserializer.getVoterAccount(voter1Pda);
       
        expect(partyA!.positive_votes).toBe(1);
        expect(partyA!.negative_votes).toBe(0);
        expect(voter1state!.positive_used).toBe(1);
        expect(voter1state!.negative_used).toBe(0);
        expect(voter1state!.voted_parties).toHaveLength(1);
        expect(new PublicKey(voter1state!.voted_parties[0]).toString()).toBe(partyAPda.toString());

        console.log('Voter 1 voted for Party A with signature:', signature1);
    });

    test('should not allow voter1 to use second positive vote for the same party', async () => {
        // Vote positive for Party A (not allowed -> second vote for the same party)
        const { signature: signature2, voterPda: voterPda2 } = await transactionService.vote(voter1, pollPda, partyAPda, VoteType.Positive);
        expect(signature2).toBeUndefined();
        expect(voterPda2).toBeUndefined();
    });

    test('should not allow voter1 to use negative vote', async () => {
        // Vote negative for Party B (not allowed -> expect 2 positive voices first)
        const { signature: signature1, voterPda: voterPda1 } = await transactionService.vote(voter1, pollPda, partyBPda, VoteType.Negative);
        expect(signature1).toBeUndefined();
        expect(voterPda1).toBeUndefined();
    });

    test('should allow voter1 to use second positive vote for another party', async () => {
        // Vote positive for Party B (second vote)
        const { signature: signature1, voterPda: voterPda1 } = await transactionService.vote(voter1, pollPda, partyBPda, VoteType.Positive);
        await connection.confirmTransaction(signature1!, "confirmed");

        
        expect(voterPda1).toBeDefined();
        expect(signature1).toBeDefined();

        const deserializer = createAccountDeserializer(connection);
        const partyB = await deserializer.getPartyAccount(partyBPda);
        const voter1state = await deserializer.getVoterAccount(voter1Pda);
       
        expect(partyB!.positive_votes).toBe(1);
        expect(partyB!.negative_votes).toBe(0);
        expect(voter1state!.positive_used).toBe(2);
        expect(voter1state!.negative_used).toBe(0);
        expect(voter1state!.voted_parties).toHaveLength(2);
        expect(new PublicKey(voter1state!.voted_parties[1]).toString()).toBe(partyBPda.toString());

        console.log('Voter 1 voted for Party B with signature:', signature1);
    });

    test('should not allow voter1 to use negative vote for the voted party', async () => {
        // Vote negative for Party B (not allowed -> voted party)
        const { signature: signature1, voterPda: voterPda1 } = await transactionService.vote(voter1, pollPda, partyBPda, VoteType.Negative);
        expect(signature1).toBeUndefined();
        expect(voterPda1).toBeUndefined();
    });

    test('should allow voter1 to use negative vote for party C', async () => {
        // Vote negative for Party C
        const { signature, voterPda } = await transactionService.vote(voter1, pollPda, partyCPda, VoteType.Negative);
        await connection.confirmTransaction(signature!, "confirmed"); 
        
        expect(signature).toBeDefined();
        expect(voterPda).toBeDefined();

        const deserializer = createAccountDeserializer(connection);
        const partyC = await deserializer.getPartyAccount(partyCPda);
        const voter1state = await deserializer.getVoterAccount(voter1Pda);
       
        expect(partyC!.positive_votes).toBe(0);
        expect(partyC!.negative_votes).toBe(1);
        expect(voter1state!.positive_used).toBe(2);
        expect(voter1state!.negative_used).toBe(1);
        expect(voter1state!.voted_parties).toHaveLength(3);
        expect(new PublicKey(voter1state!.voted_parties[2]).toString()).toBe(partyCPda.toString());

        console.log('Voter 1 voted for Party C with signature:', signature);
    });
  });

//   describe('Results and Statistics', () => {
//     test('should get voting results', async () => {
//       const results = await pollOwnerClient.getVotingResults(pollPda);
      
//       expect(results).toHaveLength(2);
      
//       const partyA = results.find(r => r.party === 'Democratic Party');
//       const partyB = results.find(r => r.party === 'Republican Party');
      
//       expect(partyA).toBeDefined();
//       expect(partyB).toBeDefined();
      
//       // Voter1: +2 for Party A, -1 for Party B
//       // Voter2: +2 for Party B, -1 for Party A
//       expect(partyA!.positiveVotes).toBe(2);
//       expect(partyA!.negativeVotes).toBe(1);
//       expect(partyB!.positiveVotes).toBe(2);
//       expect(partyB!.negativeVotes).toBe(1);
      
//       console.log('Final Results:', results);
//     });

//     test('should retrieve updated party accounts', async () => {
//       const partyA = await pollOwnerClient.getPartyAccount(partyAPda);
//       const partyB = await pollOwnerClient.getPartyAccount(partyBPda);
      
//       expect(partyA!.positiveVotes).toBe(2);
//       expect(partyA!.negativeVotes).toBe(1);
//       expect(partyB!.positiveVotes).toBe(2);
//       expect(partyB!.negativeVotes).toBe(1);
//     });
//   });

//   describe('Error Handling', () => {
//     test('should prevent double voting for the same party', async () => {
//       await expect(
//         voter1Client.vote(pollPda, partyAPda, VoteType.Positive)
//       ).rejects.toThrow();
//     });

//     test('should prevent negative vote without using all positive votes', async () => {
//       const newVoter = Keypair.generate();
//       const newVoterClient = new JanecekVotingClient({
//         connection,
//         programId,
//         wallet: newVoter,
//       });

//       // Try to vote negative without positive votes first
//       await expect(
//         newVoterClient.vote(pollPda, partyAPda, VoteType.Negative)
//       ).rejects.toThrow();
//     });

//     test('should prevent voting during registration phase', async () => {
//       // Create a new poll
//       const { pollPda: newPollPda } = await pollOwnerClient.createPoll(
//         'Error Test Poll',
//         'Testing error conditions'
//       );

//       // Try to vote before starting voting phase
//       await expect(
//         voter1Client.vote(newPollPda, partyAPda, VoteType.Positive)
//       ).rejects.toThrow();
//     });
//   });

  describe('Owner Transfer', () => {
    
    test('should not accept owner transfer', async () => {
        const signature = await transactionService.acceptOwnerTransfer(pollOwner2, pollPda);
        expect(signature).toBeUndefined();
    });
    
    test('should initiate owner transfer', async () => {
      const signature = await transactionService.initiateOwnerTransfer(
        pollOwner,
        pollPda,
        pollOwner2.publicKey
      );
      await connection.confirmTransaction(signature!, "confirmed");

      const deserializer = createAccountDeserializer(connection);
      const pollState = await deserializer.getPollState(pollPda);
      
      expect(signature).toBeDefined();
      expect(pollState).toBeDefined();
      expect(new PublicKey(pollState!.owner).toString()).toBe(pollOwner.publicKey.toString());
      expect(new PublicKey(pollState!.expected_new_owner).toString()).toBe(pollOwner2.publicKey.toString());

      console.log('Owner transfer initiated with signature:', signature);
    });

    test('should accept owner transfer', async () => {
      const signature = await transactionService.acceptOwnerTransfer(pollOwner2, pollPda);
      
      expect(signature).toBeDefined();
      await connection.confirmTransaction(signature!, "confirmed");

      const deserializer = createAccountDeserializer(connection);
      const pollState = await deserializer.getPollState(pollPda);

      expect(pollState).toBeDefined();
      expect(new PublicKey(pollState!.owner).toString()).toBe(pollOwner2.publicKey.toString());
      expect(new PublicKey(pollState!.expected_new_owner).toString()).toBe(pollOwner2.publicKey.toString());
      expect(signature).toBeDefined();

      console.log('Owner transfer accepted with signature:', signature);
    });
  });

  afterAll(async () => {
    console.log('Integration tests completed');
    console.log('Poll PDA:', pollPda.toString());
    console.log('Party A PDA:', partyAPda.toString());
    console.log('Party B PDA:', partyBPda.toString());
    console.log('Party C PDA:', partyCPda.toString());
    console.log('Voter 1 PDA:', voter1Pda.toString());
  });
});
