use anchor_lang::prelude::*;

use crate::state::{PollAccount, VotingPhase};
use crate::errors::JanecekError;


pub fn close_voting(
    ctx: Context<CloseVoting>,
) -> Result<()> {

    let poll = &mut ctx.accounts.poll;

    require!(
        poll.phase == VotingPhase::Voting,
        JanecekError::NotInVotingPhase
    );

    let clock = Clock::get()?;
    let elapsed = clock.unix_timestamp - poll.voting_start_at;

    #[cfg(not(feature = "test-fast"))]
    const MIN_TIME_DELTA: i64 = 60 * 60 * 24 * 7;

    #[cfg(feature = "test-fast")]
    const MIN_TIME_DELTA: i64 = 0;

    require!(
        elapsed >= MIN_TIME_DELTA,
        JanecekError::VotingWasNotFinished
    );

    poll.phase = VotingPhase::Results;

    Ok(())
}


#[derive(Accounts)]
#[instruction(poll_title_hash: [u8; 32], poll_description_hash: [u8; 32])]
pub struct CloseVoting<'info> {
    #[account(mut)]
    pub anyone: Signer<'info>,

    #[account(
        mut,
        seeds = [b"poll", poll_title_hash.as_ref(), poll_description_hash.as_ref()],
        bump
    )]
    pub poll: Account<'info, PollAccount>,
}

