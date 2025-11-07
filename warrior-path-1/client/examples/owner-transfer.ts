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
 * Advanced example showing owner transfer functionality
 */
async function ownerTransferExample() {
  // Setup connection and wallets
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
  const originalOwner = Keypair.generate();
  const newOwner = Keypair.generate();
  
  // Replace with your actual program ID
  const programId = new PublicKey('YOUR_PROGRAM_ID_HERE');
  
  // Create client with original owner
  const client = new JanecekVotingClient({
    connection,
    programId,
    wallet: originalOwner,
  });

  try {
    console.log('Creating poll with original owner...');
    const { pollPda } = await client.createPoll(
      'Owner Transfer Test',
      'Testing owner transfer functionality'
    );
    console.log('Poll created:', pollPda.toString());

    // Wait for transaction confirmation
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\nInitiating owner transfer...');
    const transferSignature = await client.initiateOwnerTransfer(pollPda, newOwner.publicKey);
    console.log('Owner transfer initiated. Transaction signature:', transferSignature);

    // Wait for transaction confirmation
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\nChecking poll state before transfer...');
    const pollStateBefore = await client.getPollState(pollPda);
    if (pollStateBefore) {
      console.log('Current owner:', pollStateBefore.owner.toString());
      console.log('Expected new owner:', pollStateBefore.expectedNewOwner.toString());
    }

    // Create new client with new owner
    const newOwnerClient = new JanecekVotingClient({
      connection,
      programId,
      wallet: newOwner,
    });

    console.log('\nAccepting owner transfer with new owner...');
    const acceptSignature = await newOwnerClient.acceptOwnerTransfer(pollPda);
    console.log('Owner transfer accepted. Transaction signature:', acceptSignature);

    // Wait for transaction confirmation
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\nChecking poll state after transfer...');
    const pollStateAfter = await newOwnerClient.getPollState(pollPda);
    if (pollStateAfter) {
      console.log('Current owner:', pollStateAfter.owner.toString());
      console.log('Expected new owner:', pollStateAfter.expectedNewOwner.toString());
    }

    console.log('\nCreating party with new owner...');
    const { partyPda } = await newOwnerClient.createParty(pollPda, 'New Owner Party');
    console.log('Party created by new owner:', partyPda.toString());

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the example
if (require.main === module) {
  ownerTransferExample().catch(console.error);
}
