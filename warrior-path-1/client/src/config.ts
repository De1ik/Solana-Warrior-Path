import { PublicKey, clusterApiUrl } from '@solana/web3.js';

export const CONFIG = {
  // Solana network configuration
  network: 'devnet',
  rpcUrl: clusterApiUrl('devnet'),
  
  // Program configuration
  programId: new PublicKey('4tdkaWkV9UoGr3qzpDYQdyBSN3eA4EqKJjhfz3Q7ADkF'),
  
  // Wallet configuration
  walletPath: './wallet.json', 
  
  // Transaction configuration
  commitment: 'confirmed' as const, // 'processed', 'confirmed', 'finalized'
  maxRetries: 3,
  
  // Poll configuration
  defaultRegistrationPeriod: 24 * 60 * 60, // 24 hours in seconds
  defaultVotingPeriod: 7 * 24 * 60 * 60, // 7 days in seconds
};

