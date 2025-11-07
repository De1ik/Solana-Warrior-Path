use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash::hash;

use crate::state::{PollAccount, VotingPhase};
use crate::errors::JanecekError;


pub fn initialize_poll(
    ctx: Context<InitializePoll>,
    poll_title: String,
    poll_description: String,
    poll_title_hash: [u8; 32],
    poll_description_hash: [u8; 32],
) -> Result<()> {

    let expected_title_hash = hash(poll_title.as_bytes()).to_bytes();
    let expected_description_hash = hash(poll_description.as_bytes()).to_bytes();

    require!(
        expected_title_hash == poll_title_hash,
        JanecekError::PollTitleHashMismatch
    );
    require!(
        expected_description_hash == poll_description_hash,
        JanecekError::PollDescriptionHashMismatch
    );

    let poll = &mut ctx.accounts.poll;
    poll.title = poll_title;
    poll.description = poll_description;
    poll.phase = VotingPhase::Registration;
    poll.party_counter = 0;
    poll.owner = ctx.accounts.creator.key();
    poll.expected_new_owner = ctx.accounts.creator.key();
    poll.created_at = Clock::get()?.unix_timestamp;
    poll.voting_start_at = 0;

    Ok(())
}


#[derive(Accounts)]
#[instruction(_poll_title: String, _poll_description: String, poll_title_hash: [u8; 32], poll_description_hash: [u8; 32])]
pub struct InitializePoll<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        init,
        payer = creator,
        space = 8 + PollAccount::INIT_SPACE,
        seeds = [b"poll", poll_title_hash.as_ref(), poll_description_hash.as_ref()],
        bump
    )]
    pub poll: Account<'info, PollAccount>,
    pub system_program: Program<'info, System>,
}
