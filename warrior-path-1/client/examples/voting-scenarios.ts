import { 
  Connection, 
  Keypair, 
  PublicKey, 
  clusterApiUrl 
} from '@solana/web3.js';
import { 
  JanecekVotingClient, 
  VoteType, 
  VotingPhase 
} from '../src';

/**
 * Test file demonstrating various voting scenarios
 */
async function votingScenariosTest() {
  // Setup connection and wallets
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
  const pollOwner = Keypair.generate();
  const voter1 = Keypair.generate();
  const voter2 = Keypair.generate();
  
  // Replace with your actual program ID
  const programId = new PublicKey('YOUR_PROGRAM_ID_HERE');
  
  // Create client with poll owner
  const pollOwnerClient = new JanecekVotingClient({
    connection,
    programId,
    wallet: pollOwner,
  });

  try {
    console.log('=== Setting up poll ===');
    const { pollPda } = await pollOwnerClient.createPoll(
      'Multi-Voter Test',
      'Testing multiple voters and voting scenarios'
    );
    console.log('Poll created:', pollPda.toString());

    // Wait for transaction confirmation
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Create multiple parties
    console.log('\n=== Creating parties ===');
    const { partyPda: partyAPda } = await pollOwnerClient.createParty(pollPda, 'Party A');
    const { partyPda: partyBPda } = await pollOwnerClient.createParty(pollPda, 'Party B');
    const { partyPda: partyCPda } = await pollOwnerClient.createParty(pollPda, 'Party C');
    
    console.log('Party A:', partyAPda.toString());
    console.log('Party B:', partyBPda.toString());
    console.log('Party C:', partyCPda.toString());

    // Wait for transactions to be confirmed
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\n=== Starting voting ===');
    await pollOwnerClient.startVoting(pollPda);
    console.log('Voting started');

    // Wait for transaction confirmation
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test voting scenarios
    console.log('\n=== Testing voting scenarios ===');
    
    // Voter 1: Vote positive for Party A twice, then negative for Party B
    const voter1Client = new JanecekVotingClient({
      connection,
      programId,
      wallet: voter1,
    });

    console.log('Voter 1 voting positive for Party A (1/2)...');
    await voter1Client.vote(pollPda, partyAPda, VoteType.Positive);
    
    console.log('Voter 1 voting positive for Party A (2/2)...');
    await voter1Client.vote(pollPda, partyAPda, VoteType.Positive);
    
    console.log('Voter 1 voting negative for Party B...');
    await voter1Client.vote(pollPda, partyBPda, VoteType.Negative);

    // Wait for transactions to be confirmed
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Voter 2: Vote positive for Party B twice, then negative for Party C
    const voter2Client = new JanecekVotingClient({
      connection,
      programId,
      wallet: voter2,
    });

    console.log('Voter 2 voting positive for Party B (1/2)...');
    await voter2Client.vote(pollPda, partyBPda, VoteType.Positive);
    
    console.log('Voter 2 voting positive for Party B (2/2)...');
    await voter2Client.vote(pollPda, partyBPda, VoteType.Positive);
    
    console.log('Voter 2 voting negative for Party C...');
    await voter2Client.vote(pollPda, partyCPda, VoteType.Negative);

    // Wait for transactions to be confirmed
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\n=== Final Results ===');
    const results = await pollOwnerClient.getVotingResults(pollPda);
    results.forEach(result => {
      console.log(`${result.party}: +${result.positiveVotes} -${result.negativeVotes}`);
    });

    console.log('\n=== Voter Account States ===');
    const voter1Account = await pollOwnerClient.getVoterAccount(pollPda, voter1.publicKey);
    const voter2Account = await pollOwnerClient.getVoterAccount(pollPda, voter2.publicKey);
    
    if (voter1Account) {
      console.log('Voter 1 - Positive used:', voter1Account.positiveUsed, 'Negative used:', voter1Account.negativeUsed);
    }
    
    if (voter2Account) {
      console.log('Voter 2 - Positive used:', voter2Account.positiveUsed, 'Negative used:', voter2Account.negativeUsed);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the test
if (require.main === module) {
  votingScenariosTest().catch(console.error);
}
