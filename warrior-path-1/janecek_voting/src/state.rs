use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::pubkey::Pubkey;

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub enum VotingPhase {
    Registration, 
    Voting,
    Results
}

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub enum VoteType {
    Positive, 
    Negative
}

// ["poll", itle, owner]
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct PollState {
    pub discriminator: String,
    pub title: String,
    pub description: String,
    pub phase: VotingPhase,
    pub party_counter: u64,
    pub owner: Pubkey,
    pub expected_new_owner: Pubkey,
    pub created_at: i64,
    pub voting_start_at: i64,
}

impl PollState {
    pub const DISCRIMINATOR: &'static str = "poll";

    pub fn get_account_size(title: &String, description: &String) -> usize {
        return (4 + PollState::DISCRIMINATOR.len()) 
        + (4 + title.len()) 
        + (4 + description.len())
        + 1
        + 8
        + 32
        + 32
        + 8
        + 8;
    }
}


// ["party", poll_id_pubkey, party_title]
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct PartyAccount {
    pub discriminator: String,
    pub poll_id: Pubkey,
    pub title: String,
    pub positive_votes: u64,
    pub negative_votes: u64,
}

impl PartyAccount {
    pub const DISCRIMINATOR: &'static str = "party";

    pub fn get_account_size(title: &String) -> usize {
        return (4 + PartyAccount::DISCRIMINATOR.len()) 
            + 32
            + (4 + title.len())
            + 8
            + 8;
    }
}


// ["voter", poll_id_pubkey, voter_pubkey]
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct VoterAccount {
    pub discriminator: String,
    pub poll_key: Pubkey,
    pub voter_key: Pubkey,
    pub positive_used: u8,
    pub negative_used: u8,
    pub voted_parties: Vec<Pubkey>,
}

impl VoterAccount {
    pub const DISCRIMINATOR: &'static str = "voter";
    pub const MAX_VOTED_PARTIES: usize = 3;

    pub fn get_account_size() -> usize {
        return (4 + VoterAccount::DISCRIMINATOR.len())
        + 32
        + 32
        + 1
        + 1
        + 4 + (32 * VoterAccount::MAX_VOTED_PARTIES);
    }
}