use anchor_lang::prelude::*;

use crate::state::PollAccount;

pub fn accept_owner_transfer(
    ctx: Context<AcceptOwnerTransfer>,
) -> Result<()> {
    let poll = &mut ctx.accounts.poll;
    poll.owner = ctx.accounts.expected_owner.key();

    Ok(())
}


#[derive(Accounts)]
#[instruction(poll_title_hash: [u8; 32], poll_description_hash: [u8; 32])]
pub struct AcceptOwnerTransfer<'info> {
    #[account(
        mut,
        address = poll.expected_new_owner
    )]
    pub expected_owner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"poll", poll_title_hash.as_ref(), poll_description_hash.as_ref()],
        bump = poll.bump,
    )]
    pub poll: Account<'info, PollAccount>
}