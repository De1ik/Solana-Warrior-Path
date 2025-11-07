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
} from './src';

/**
 * Example usage of the Janecek Voting Client
 */
async function example() {
  // Setup connection and wallet
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
  const wallet = Keypair.generate();
  
  // Replace with your actual program ID
  const programId = new PublicKey('YOUR_PROGRAM_ID_HERE');
  
  // Create client
  const client = new JanecekVotingClient({
    connection,
    programId,
    wallet,
  });

  try {
    console.log('Creating poll...');
    const { pollPda, signature: pollSignature } = await client.createPoll(
      'Election 2024',
      'Presidential election for 2024'
    );
    console.log('Poll created:', pollPda.toString());
    console.log('Transaction signature:', pollSignature);

    // Wait a bit for the transaction to be confirmed
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\nCreating parties...');
    const { partyPda: partyAPda, signature: partyASignature } = await client.createParty(
      pollPda,
      'Democratic Party'
    );
    console.log('Party A created:', partyAPda.toString());
    console.log('Transaction signature:', partyASignature);

    const { partyPda: partyBPda, signature: partyBSignature } = await client.createParty(
      pollPda,
      'Republican Party'
    );
    console.log('Party B created:', partyBPda.toString());
    console.log('Transaction signature:', partyBSignature);

    // Wait a bit for the transactions to be confirmed
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\nStarting voting...');
    const votingSignature = await client.startVoting(pollPda);
    console.log('Voting started. Transaction signature:', votingSignature);

    // Wait a bit for the transaction to be confirmed
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\nCasting votes...');
    const vote1Signature = await client.vote(pollPda, partyAPda, VoteType.Positive);
    console.log('Vote 1 cast. Transaction signature:', vote1Signature);

    const vote2Signature = await client.vote(pollPda, partyAPda, VoteType.Positive);
    console.log('Vote 2 cast. Transaction signature:', vote2Signature);

    const vote3Signature = await client.vote(pollPda, partyBPda, VoteType.Negative);
    console.log('Vote 3 cast. Transaction signature:', vote3Signature);

    // Wait a bit for the transactions to be confirmed
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\nGetting poll state...');
    const pollState = await client.getPollState(pollPda);
    if (pollState) {
      console.log('Poll title:', pollState.title);
      console.log('Poll description:', pollState.description);
      console.log('Poll phase:', VotingPhase[pollState.phase]);
      console.log('Poll owner:', pollState.owner.toString());
      console.log('Number of parties:', pollState.parties.length);
    }

    console.log('\nGetting voting results...');
    const results = await client.getVotingResults(pollPda);
    console.log('Voting results:', results);

    console.log('\nGetting voter account...');
    const voterAccount = await client.getVoterAccount(pollPda, wallet.publicKey);
    if (voterAccount) {
      console.log('Voter positive votes used:', voterAccount.positiveUsed);
      console.log('Voter negative votes used:', voterAccount.negativeUsed);
      console.log('Parties voted for:', voterAccount.votedParties.length);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the example
if (require.main === module) {
  example().catch(console.error);
}
