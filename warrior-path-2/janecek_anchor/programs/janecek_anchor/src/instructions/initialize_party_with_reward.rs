use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash::hash;
use anchor_lang::system_program;

use anchor_spl::token_interface::{TokenInterface, Mint};

use crate::state::{PartyAccount, PollAccount};
use crate::errors::JanecekError;
use crate::GLOBAL_PERMANENT_DELEGATE;

use hook_program;


pub fn initialize_party_with_reward(
    ctx: Context<InitializePartyWithReward>,
    title: String,
    title_hash: [u8; 32],
    reward_enabled: bool,
) -> Result<()> {
    require!(title.len() <= 32, JanecekError::InvalidTitleLength);
    
    let expected_title_hash = hash(title.as_bytes()).to_bytes();
    require!(
        expected_title_hash == title_hash,
        JanecekError::PollTitleHashMismatch
    );

    let mint = &ctx.accounts.mint;
    let poll = &mut ctx.accounts.poll;
    let party = &mut ctx.accounts.party;

    poll.party_counter += 1;
    
    party.poll_address = poll.key();
    party.title = title;
    party.reward_enabled = reward_enabled;
    party.bump = ctx.bumps.party;
    party.positive_votes = 0;
    party.negative_votes = 0;
    party.mint_address = Some(mint.key());
    
    Ok(())
}


#[derive(Accounts)]
#[instruction(_party_title: String, party_title_hash: [u8; 32], poll_title_hash: [u8; 32], poll_description_hash: [u8; 32], _reward_enabled: bool)]
pub struct InitializePartyWithReward<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        constraint = poll.owner == creator.key() @ JanecekError::Unauthorized,
        mut,
        seeds = [b"poll", poll_title_hash.as_ref(), poll_description_hash.as_ref()],
        bump = poll.bump,
    )]
    pub poll: Account<'info, PollAccount>,

    #[account(
        init,
        payer = creator,
        space = PartyAccount::INIT_SPACE,
        seeds = [b"party", poll.key().as_ref(), party_title_hash.as_ref()],
        bump
    )]
    pub party: Account<'info, PartyAccount>,

    #[account(
        init,
        payer = creator,
        seeds = [b"mint", poll.key().as_ref(), party_title_hash.as_ref()],
        bump,
        mint::decimals = 0,
        mint::authority = party.key(),
        mint::token_program = token_program,    
        extensions::transfer_hook::authority = party.key(),
        extensions::transfer_hook::program_id = hook_program::ID,
        extensions::permanent_delegate::delegate = GLOBAL_PERMANENT_DELEGATE,
    )]
    pub mint: InterfaceAccount<'info, Mint>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}
