import { 
  Connection, 
  Keypair, 
  PublicKey, 
  clusterApiUrl 
} from '@solana/web3.js';
import { 
  JanecekVotingClient, 
  VoteType, 
  VotingPhase,
  JanecekUtils 
} from '../index';

describe('JanecekVotingClient', () => {
  let connection: Connection;
  let wallet: Keypair;
  let programId: PublicKey;
  let client: JanecekVotingClient;

  beforeAll(() => {
    connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    wallet = Keypair.generate();
    // Replace with your actual program ID
    programId = new PublicKey('6LKL9MnuNGd3fpEp5U3P9Sm8LW5YuHasKRp8Jwyp9Hhy');
    
    client = new JanecekVotingClient({
      connection,
      programId,
      wallet,
    });
  });


  describe('Client Methods', () => {
    test('should create client with correct configuration', () => {
      expect(client).toBeInstanceOf(JanecekVotingClient);
    });

    test('should have all required methods', () => {
      expect(typeof client.createPoll).toBe('function');
      expect(typeof client.createParty).toBe('function');
      expect(typeof client.initiateOwnerTransfer).toBe('function');
      expect(typeof client.acceptOwnerTransfer).toBe('function');
      expect(typeof client.startVoting).toBe('function');
      expect(typeof client.vote).toBe('function');
      expect(typeof client.endVoting).toBe('function');
      expect(typeof client.getPollState).toBe('function');
      expect(typeof client.getPartyAccount).toBe('function');
      expect(typeof client.getVoterAccount).toBe('function');
      expect(typeof client.getPollParties).toBe('function');
      expect(typeof client.isVotingActive).toBe('function');
      expect(typeof client.isRegistrationActive).toBe('function');
      expect(typeof client.getVotingResults).toBe('function');
    });
  });

  describe('Enums', () => {
    test('VotingPhase enum should have correct values', () => {
      expect(VotingPhase.Registration).toBe(0);
      expect(VotingPhase.Voting).toBe(1);
      expect(VotingPhase.Results).toBe(2);
    });

    test('VoteType enum should have correct values', () => {
      expect(VoteType.Positive).toBe(0);
      expect(VoteType.Negative).toBe(1);
    });
  });

  // Note: Integration tests that actually interact with the blockchain
  // would require a deployed program and funded accounts
  // These would be marked as integration tests and run separately
});
