use anchor_lang::prelude::*;

pub mod instructions;
pub mod errors;
pub mod state;

pub use instructions::*;
pub use state::VoteType;

declare_id!("4iXWdAoeJQMVr39ZhziS4hDfTz9K1soQTN88NLDwwinH");

pub const GLOBAL_PERMANENT_DELEGATE: Pubkey = pubkey!("FrseZqdnrzEiJtWAodcrGjWTAJf1TCa3dtWu4fduxWtR");


#[program]
pub mod janecek_anchor {
    use super::*;

    pub fn init_poll(
        ctx: Context<InitializePoll>,
        poll_title: String,
        poll_description: String,
        poll_title_hash: [u8; 32],
        poll_description_hash: [u8; 32],
    ) -> Result<()> {

        initialize_poll(
            ctx,
            poll_title,
            poll_description,
            poll_title_hash,
            poll_description_hash
        )
    }

    pub fn init_reward_party(
        ctx: Context<InitializePartyWithReward>,
        party_title: String,
        party_title_hash: [u8; 32],
        _poll_title_hash: [u8; 32],
        _poll_description_hash: [u8; 32],
        reward_enabled: bool,
    ) -> Result<()> {

        initialize_party_with_reward(
            ctx,
            party_title,
            party_title_hash,
            reward_enabled
        )
    }


    pub fn init_non_reward_party(
        ctx: Context<InitializePartyNonReward>,
        party_title: String,
        party_title_hash: [u8; 32],
        _poll_title_hash: [u8; 32],
        _poll_description_hash: [u8; 32],
        reward_enabled: bool,
    ) -> Result<()> {

        initialize_party_non_reward(
            ctx,
            party_title,
            party_title_hash,
            reward_enabled
        )
    }


    pub fn init_owner_transfer(
        ctx: Context<InitiateOwnerTransfer>,
        _poll_title_hash: [u8; 32],
        _poll_description_hash: [u8; 32],
        expected_owner: Pubkey
    ) -> Result <()> {
        initiate_owner_transfer(ctx, expected_owner)
    }

    pub fn accept_owner(
        ctx: Context<AcceptOwnerTransfer>,
        _poll_title_hash: [u8; 32],
        _poll_description_hash: [u8; 32],
    ) -> Result <()> {
        accept_owner_transfer(ctx)
    }


    pub fn init_voting(
        ctx: Context<StartVoting>,
        _poll_title_hash: [u8; 32],
        _poll_description_hash: [u8; 32],
    ) -> Result<()> {
        start_voting(ctx)
    }

    pub fn finish_voting(
        ctx: Context<CloseVoting>,
        _poll_title_hash: [u8; 32],
        _poll_description_hash: [u8; 32],
    ) -> Result<()> {
        close_voting(ctx)
    }

    pub fn free_vote(
        ctx: Context<FreeVote>,
        _poll_title_hash: [u8; 32],
        _poll_description_hash: [u8; 32],
        vote_type: VoteType,
        _party_title_hash: [u8; 32],
    ) -> Result <()> {
        vote_free(ctx, vote_type)
    }

    pub fn reward_vote(
        ctx: Context<RewardVote>,
        _poll_title_hash: [u8; 32],
        _poll_description_hash: [u8; 32],
        vote_type: VoteType,
        party_title_hash: [u8; 32],
    ) -> Result <()> {
        vote_with_reward(ctx, vote_type, party_title_hash)
    }

}
