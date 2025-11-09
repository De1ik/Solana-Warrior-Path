use anchor_lang::prelude::*;

use crate::state::{PollAccount};
use crate::errors::JanecekError;

pub fn initiate_owner_transfer(
    ctx: Context<InitiateOwnerTransfer>,
    new_owner: Pubkey
) -> Result<()> {
    let poll = &mut ctx.accounts.poll;
    poll.expected_new_owner = new_owner;

    Ok(())
}



#[derive(Accounts)]
#[instruction(poll_title_hash: [u8; 32], poll_description_hash: [u8; 32], _expected_owner: Pubkey)]
pub struct InitiateOwnerTransfer<'info>{
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"poll", poll_title_hash.as_ref(), poll_description_hash.as_ref()],
        bump = poll.bump,
        has_one = owner @ JanecekError::Unauthorized
    )]
    pub poll: Account<'info, PollAccount>
}
