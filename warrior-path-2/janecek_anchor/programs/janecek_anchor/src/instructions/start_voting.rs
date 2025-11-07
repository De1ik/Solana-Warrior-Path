use anchor_lang::prelude::*;

use crate::state::{PollAccount, VotingPhase};
use crate::errors::JanecekError;


pub fn start_voting(
    ctx: Context<StartVoting>
) -> Result <()> {
    let poll = &mut ctx.accounts.poll;

    require!(
        poll.phase == VotingPhase::Registration, 
        JanecekError::NotInRegistrationPhase
    );

    let clock = Clock::get()?;
    let elapsed = clock.unix_timestamp - poll.created_at;

    #[cfg(not(feature = "test-fast"))]
    const MIN_TIME_DELTA: i64 = 60 * 60 * 24;

    #[cfg(feature = "test-fast")]
    const MIN_TIME_DELTA: i64 = 0;

    require!(
        elapsed > MIN_TIME_DELTA, 
        JanecekError::RegistrationPhaseTooShort
    );

    poll.phase = VotingPhase::Voting;
    poll.voting_start_at = clock.unix_timestamp;
    
    Ok(())
}


#[derive(Accounts)]
#[instruction(poll_title_hash: [u8; 32], poll_description_hash: [u8; 32])]
pub struct StartVoting<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"poll", poll_title_hash.as_ref(), poll_description_hash.as_ref()],
        bump
    )]
    pub poll: Account<'info, PollAccount>
}
