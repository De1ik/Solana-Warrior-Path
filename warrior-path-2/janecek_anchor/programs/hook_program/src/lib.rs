use anchor_lang::prelude::*;
use anchor_spl::{
    token_interface::{Mint, TokenAccount},
};

use anchor_spl::token_2022::spl_token_2022::{
    extension::{
        permanent_delegate::PermanentDelegate,
        StateWithExtensions,
        BaseStateWithExtensions,
    },
    state::Mint as Mint2022,
};

declare_id!("DBkCSr6ZXmYzXUecrtBSrzctRJCSdPCXhGpR1DPAx7At");

#[program]
pub mod transfer_hook {
    use super::*;
    pub fn transfer_hook(ctx: Context<TransferHook>, _amount: u64) -> Result<()> {
        let signer = &ctx.accounts.owner;
        let source_token = &ctx.accounts.source_token;
        let mint_acc = &ctx.accounts.mint;


        let mint_info = mint_acc.to_account_info();
        let mint_data = mint_info.try_borrow_data()?;

        let mint_with_ext = StateWithExtensions::<Mint2022>::unpack(&mint_data)?;

        let mut perm_delegate = Pubkey::default();

        // Permanent delegate check
        if let Ok(ext) = mint_with_ext.get_extension::<PermanentDelegate>() {
            perm_delegate = ext.delegate.0.key();
        }

        require!(perm_delegate == signer.key() || source_token.owner == signer.key(), HookError::Unauthorized);

        msg!("Hello Transfer Hook!");
        Ok(())
    }


    // fallback instruction handler (оставляем как есть)
    pub fn fallback<'info>(
        program_id: &Pubkey,
        accounts: &'info [AccountInfo<'info>],
        data: &[u8],
    ) -> Result<()> {
        let instruction = spl_transfer_hook_interface::instruction::TransferHookInstruction::unpack(data)?;

        match instruction {
            spl_transfer_hook_interface::instruction::TransferHookInstruction::Execute { amount } => {
                let amount_bytes = amount.to_le_bytes();
                __private::__global::transfer_hook(program_id, accounts, &amount_bytes)
            }
            _ => return Err(ProgramError::InvalidInstructionData.into()),
        }
    }
}


#[derive(Accounts)]
pub struct TransferHook<'info> {
    #[account(
        token::mint = mint,
    )]
    pub source_token: InterfaceAccount<'info, TokenAccount>,

    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
        token::mint = mint,
    )]
    pub destination_token: InterfaceAccount<'info, TokenAccount>,

    /// CHECK: signer (может быть owner или permanent delegate)
    pub owner: UncheckedAccount<'info>,
}


#[error_code]
pub enum HookError {
    #[msg("Authority is neither owner nor permanent delegate")]
    Unauthorized,
}
