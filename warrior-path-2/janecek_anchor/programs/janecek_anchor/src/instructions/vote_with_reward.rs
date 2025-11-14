use anchor_lang::prelude::*;
use anchor_spl::{
    // token::{self, Mint, TokenAccount, MintTo, Token},
    token_interface::{TokenInterface, TokenAccount, Mint, mint_to, MintTo},
    associated_token::AssociatedToken,
};




use crate::state::{PartyAccount, PollAccount, VoterAccount, VotingPhase, VoteType};
use crate::errors::JanecekError;

#[derive(Accounts)]
#[instruction(
    poll_title_hash: [u8; 32], 
    poll_description_hash: [u8; 32], 
    _vote_type: VoteType,
    party_title_hash: [u8; 32]
)]
pub struct RewardVote<'info> {
    #[account(mut)]
    pub voter: Signer<'info>,

    #[account(
        mut,
        seeds = [b"poll", poll_title_hash.as_ref(), poll_description_hash.as_ref()],
        bump = poll.bump,
    )]
    pub poll: Account<'info, PollAccount>,

    #[account(
        mut,
        seeds = [b"party", poll.key().as_ref(), party_title_hash.as_ref()],
        bump = party.bump,
        constraint = party.poll_address == poll.key() @ JanecekError::InvalidPollAddress,
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

    #[account(
        mut,
        seeds = [b"mint", poll.key().as_ref(), party_title_hash.as_ref()],
        bump
    )]
    pub mint: InterfaceAccount<'info, Mint>,

    /// CHECK: ATA may or may not exist; validated in handler
    #[account(mut)]
    pub voter_ata: UncheckedAccount<'info>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn vote_with_reward(
    ctx: Context<RewardVote>, 
    vote_type: VoteType,
    party_title_hash: [u8; 32],
) -> Result<()> {
    
    let poll = &mut ctx.accounts.poll;

    require!(poll.phase == VotingPhase::Voting, JanecekError::NotInVotingPhase);
    
    let clock = Clock::get()?;
    let elapsed = clock.unix_timestamp - poll.created_at;
    const MIN_TIME_DELTA: i64 = 60 * 60 * 24 * 7;
    require!(elapsed < MIN_TIME_DELTA, JanecekError::VotingWasNotFinished);

    let party = &mut ctx.accounts.party;

    require!(party.reward_enabled == true, JanecekError::RewardsDisabled);
    require!(party.mint_address.is_some(), JanecekError::InvalidMint);
    let expected_mint = party.mint_address.unwrap();
    require!(expected_mint == ctx.accounts.mint.key(), JanecekError::InvalidMint);

    let voter_pda = &mut ctx.accounts.voter_pda;

    if !voter_pda.initialized {
        voter_pda.initialized = true;
        // voter_pda.poll_addr = poll.key();
        // voter_pda.voter_addr = voter.key();
        voter_pda.positive_used = 0;
        voter_pda.negative_used = 0;
        voter_pda.voted_parties = [Pubkey::default(); 3];
        voter_pda.bump = ctx.bumps.voter_pda;
    }

    require!(!voter_pda.voted_parties.contains(&party.key()), JanecekError::AlreadyVoted);

    if vote_type == VoteType::Positive {
        require!(voter_pda.positive_used < 2, JanecekError::NoPositiveVoice);

        party.positive_votes = party.positive_votes
            .checked_add(1)
            .ok_or(JanecekError::CounterOverflow)?;
        voter_pda.positive_used += 1;

        // check if ata exists
        let ata_info = ctx.accounts.voter_ata.to_account_info();
        let voter_key = ctx.accounts.voter.key();
        let mint_key = ctx.accounts.mint.key();

        let ata_valid = assert_ata_for_owner_and_mint(
            &ata_info,
            &voter_key,
            &mint_key,
        )?;

        // create if not exists
        if !ata_valid {
            create_ata(
                &ctx.accounts.voter.to_account_info(),
                &ata_info,
                &ctx.accounts.voter.to_account_info(),
                &ctx.accounts.mint.to_account_info(),
                &ctx.accounts.associated_token_program.to_account_info(),
                &ctx.accounts.token_program.to_account_info(),
                &ctx.accounts.system_program.to_account_info(),
            )?;
            
        }

        // transfer tokens to user account
        let poll_key = poll.key();
        let seeds = &[
            b"party",
            poll_key.as_ref(),
            party_title_hash.as_ref(),
            &[party.bump]
        ];

        let signer_seeds = &[&seeds[..]];

        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.voter_ata.to_account_info(),
            authority: party.to_account_info(),
        };

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts, 
            signer_seeds
        );

        mint_to(cpi_ctx, 1)?;

    } else if vote_type == VoteType::Negative {
        require!(voter_pda.positive_used == 2, JanecekError::MustUseAllPositiveVoices);
        require!(voter_pda.negative_used == 0, JanecekError::NoNegativeVoice);

        party.negative_votes = party.negative_votes
            .checked_add(1)
            .ok_or(JanecekError::CounterOverflow)?;
        voter_pda.negative_used += 1;
    }

    if let Some(slot) = voter_pda.voted_parties.iter_mut().find(|p| **p == Pubkey::default()){
        *slot = party.key();
    } else {
        return err!(JanecekError::TooManyVotes);
    }

    Ok(())
}


fn assert_ata_for_owner_and_mint(
    ata: &AccountInfo,
    owner: &Pubkey,
    mint: &Pubkey,
) -> Result<bool> {
    if ata.owner == &anchor_spl::token::ID {
        if let Ok(token_acc) = TokenAccount::try_deserialize(&mut &ata.data.borrow()[..]) {
            return Ok(token_acc.owner == *owner && token_acc.mint == *mint);
        }
    }
    Ok(false)
}


fn create_ata<'info>(
    payer: &AccountInfo<'info>,
    ata: &AccountInfo<'info>,
    owner: &AccountInfo<'info>,
    mint: &AccountInfo<'info>,
    associated_token_program: &AccountInfo<'info>,
    token_program: &AccountInfo<'info>,
    system_program: &AccountInfo<'info>,
) -> Result<()> {
    let cpi_accounts = anchor_spl::associated_token::Create {
        payer: payer.clone(),
        associated_token: ata.clone(),
        authority: owner.clone(),
        mint: mint.clone(),
        system_program: system_program.clone(),
        token_program: token_program.clone(),
    };

    let ctx = CpiContext::new(associated_token_program.clone(), cpi_accounts);

    anchor_spl::associated_token::create(ctx)
}


