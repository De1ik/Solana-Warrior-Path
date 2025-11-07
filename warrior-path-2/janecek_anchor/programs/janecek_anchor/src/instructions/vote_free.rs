use anchor_lang::prelude::*;
use crate::state::{PartyAccount, PollAccount, VoterAccount, VotingPhase, VoteType};
use crate::errors::JanecekError;


pub fn vote_free(
    ctx: Context<FreeVote>, 
    vote_type: VoteType,
) -> Result<()> {
    
    let poll = &mut ctx.accounts.poll;

    require!(poll.phase == VotingPhase::Voting, JanecekError::NotInVotingPhase);
    
    let clock = Clock::get()?;
    let elapsed = clock.unix_timestamp - poll.created_at;
    const MIN_TIME_DELTA: i64 = 60 * 60 * 24 * 7;
    require!(elapsed < MIN_TIME_DELTA, JanecekError::VotingWasFinished);

    let party = &mut ctx.accounts.party;
    let voter_pda = &mut ctx.accounts.voter_pda;

    if !voter_pda.initialized {
        voter_pda.initialized = true;
        // voter_pda.poll_addr = poll.key();
        // voter_pda.voter_addr = voter.key();
        voter_pda.positive_used = 0;
        voter_pda.negative_used = 0;
        voter_pda.voted_parties = [Pubkey::default(); 3];
    }

    require!(!voter_pda.voted_parties.contains(&party.key()), JanecekError::AlreadyVoted);

    if vote_type == VoteType::Positive {
        require!(voter_pda.positive_used < 2, JanecekError::NoPositiveVoice);

        party.positive_votes += 1;
        voter_pda.positive_used += 1;

    } else if vote_type == VoteType::Negative {
        require!(voter_pda.positive_used == 2, JanecekError::MustUseAllPositiveVoices);
        require!(voter_pda.negative_used == 0, JanecekError::NoNegativeVoice);

        party.negative_votes += 1;
        voter_pda.negative_used += 1;
    }

    if let Some(slot) = voter_pda.voted_parties.iter_mut().find(|p| **p == Pubkey::default()){
        *slot = party.key();
    } else {
        return err!(JanecekError::TooManyVotes);
    }

    Ok(())
}



#[derive(Accounts)]
#[instruction(
    poll_title_hash: [u8; 32], 
    poll_description_hash: [u8; 32], 
    _vote_type: VoteType,
    party_title_hash: [u8; 32]
)]
pub struct FreeVote<'info> {
    #[account(mut)]
    pub voter: Signer<'info>,

    #[account(
        mut,
        seeds = [b"poll", poll_title_hash.as_ref(), poll_description_hash.as_ref()],
        bump
    )]
    pub poll: Account<'info, PollAccount>,

    #[account(
        mut,
        seeds = [b"party", poll.key().as_ref(), party_title_hash.as_ref()],
        bump
    )]
    pub party: Account<'info, PartyAccount>,

    #[account(
        init_if_needed,
        payer = voter,
        space = 8 + VoterAccount::INIT_SPACE,
        seeds = [b"voter", poll.key().as_ref(), voter.key().as_ref()],
        bump
    )]
    pub voter_pda: Account<'info, VoterAccount>,

    pub system_program: Program<'info, System>,
}