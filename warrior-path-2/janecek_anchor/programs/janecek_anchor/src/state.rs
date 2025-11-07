use anchor_lang::prelude::*;


#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum VotingPhase {
    Registration, 
    Voting,
    Results
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum VoteType {
    Positive, 
    Negative
}


#[account]
#[derive(InitSpace)]
pub struct PollAccount {
    #[max_len(32)]
    pub title: String,
    #[max_len(280)]
    pub description: String,
    pub phase: VotingPhase,
    pub party_counter: u64,
    pub owner: Pubkey,
    pub expected_new_owner: Pubkey,
    pub created_at: i64,
    pub voting_start_at: i64,
}



#[account]
#[derive(InitSpace)]
pub struct PartyAccount {
    pub poll_address: Pubkey,
    #[max_len(32)]
    pub title: String,
    pub reward_enabled: bool,
    pub positive_votes: u64,
    pub negative_votes: u64,
    pub mint_address: Option<Pubkey>,
    pub bump: u8
}


#[account]
#[derive(InitSpace)]
pub struct VoterAccount {
    pub initialized: bool,
    // pub poll_addr: Pubkey,
    // pub voter_addr: Pubkey,
    pub positive_used: u8,
    pub negative_used: u8,
    pub voted_parties: [Pubkey; 3],
}


