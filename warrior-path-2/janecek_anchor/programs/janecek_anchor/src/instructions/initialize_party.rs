use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token};
use anchor_lang::solana_program::hash::hash;

use crate::state::{PartyAccount, PollAccount};
use crate::errors::JanecekError;


pub fn initialize_party(
    ctx: Context<InitializeParty>,
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

    let poll = &mut ctx.accounts.poll;
    poll.party_counter += 1;

    let party = &mut ctx.accounts.party;
    
    party.poll_address = poll.key();
    party.title = title;
    party.reward_enabled = reward_enabled;
    party.bump = ctx.bumps.party;
    party.positive_votes = 0;
    party.negative_votes = 0;

    if reward_enabled {
        let mint_info = &ctx.accounts.mint;
        let rent = &ctx.accounts.rent;

        require!(mint_info.data_is_empty(), JanecekError::MintAlreadyExists);
        require!(mint_info.is_writable, JanecekError::InvalidMint);

        let party_key = party.key();
        let poll_key = poll.key();
        let lamports = rent.minimum_balance(Mint::LEN);

        let mint_seeds: &[&[u8]] = &[
            b"mint",
            poll_key.as_ref(),
            title_hash.as_ref(),     
            &[ctx.bumps.mint],
        ];

        let signer_seeds: &[&[&[u8]]] = &[mint_seeds];
        
        let cpi_accounts = anchor_lang::system_program::CreateAccount {
            from: ctx.accounts.creator.to_account_info(),
            to: mint_info.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            cpi_accounts,
            signer_seeds, 
        );
        
        anchor_lang::system_program::create_account(
            cpi_ctx,
            lamports,
            Mint::LEN as u64,
            &ctx.accounts.token_program.key(),
        )?;

        // Инициализируем mint
        token::initialize_mint2(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::InitializeMint2 {
                    mint: mint_info.to_account_info(),
                },
            ),
            0,             // decimals = 0
            &party_key,    // mint_authority = party PDA
            None,          // freeze_authority = None
        )?;

        // сохраняем mint адрес
        party.mint_address = Some(mint_info.key());
    } else {
        // Без награды — пустой mint
        party.mint_address = None;
    }
    
    Ok(())
}


#[derive(Accounts)]
#[instruction(_party_title: String, party_title_hash: [u8; 32], poll_title_hash: [u8; 32], poll_description_hash: [u8; 32], _reward_enabled: bool)]
pub struct InitializeParty<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        mut,
        seeds = [b"poll", poll_title_hash.as_ref(), poll_description_hash.as_ref()],
        bump
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

    /// CHECK: создаём при необходимости токен
    /// mut только когда reward_enabled = true, иначе может быть любой account
    #[account(
        mut,
        seeds = [b"mint", poll.key().as_ref(), party_title_hash.as_ref()],
        bump
    )]
    pub mint: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}
