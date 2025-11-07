import { 
  Connection, 
  Keypair, 
  PublicKey, 
  clusterApiUrl,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';

/**
 * Helper script to fund test accounts for integration tests
 * Run this before running integration tests
 */
async function fundTestAccounts() {
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
  
  // These are the accounts generated in the integration test
  // You'll need to replace these with the actual public keys from your test run
  const testAccounts = [
    'YOUR_POLL_OWNER_PUBLIC_KEY_HERE',
    'YOUR_VOTER1_PUBLIC_KEY_HERE', 
    'YOUR_VOTER2_PUBLIC_KEY_HERE'
  ];

  console.log('Funding test accounts...');
  
  for (const accountPubkey of testAccounts) {
    if (accountPubkey === 'YOUR_POLL_OWNER_PUBLIC_KEY_HERE') {
      console.log('Please update the account public keys in this script');
      continue;
    }
    
    try {
      const publicKey = new PublicKey(accountPubkey);
      const signature = await connection.requestAirdrop(publicKey, 2 * LAMPORTS_PER_SOL);
      
      console.log(`Funded ${accountPubkey}: ${signature}`);
      
      // Wait for confirmation
      await connection.confirmTransaction(signature);
      
      const balance = await connection.getBalance(publicKey);
      console.log(`Balance: ${balance / LAMPORTS_PER_SOL} SOL`);
      
    } catch (error) {
      console.error(`Failed to fund ${accountPubkey}:`, error);
    }
  }
}

// Run the funding script
if (require.main === module) {
  fundTestAccounts().catch(console.error);
}

export { fundTestAccounts };
