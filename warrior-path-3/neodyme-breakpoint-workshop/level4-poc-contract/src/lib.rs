use solana_program::{
    account_info::AccountInfo, entrypoint, entrypoint::ProgramResult,
    pubkey::Pubkey, program::invoke
};

use spl_token::instruction::TokenInstruction;

entrypoint!(process_instruction);

pub fn process_instruction(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    match TokenInstruction::unpack(instruction_data).unwrap() {
        TokenInstruction::TransferChecked { amount, .. } => {
            invoke(
                &spl_token::instruction::transfer(
                    &accounts[1].key,
                    &accounts[2].key,
                    &accounts[0].key,
                    &accounts[3].key,
                    &[],
                    amount,
                ).unwrap(),
                &[
                    accounts[0].clone(),
                    accounts[1].clone(),
                    accounts[2].clone(),
                    accounts[3].clone(),
                ],
            )
        }
        _ => {
            panic!("instruction does not exist")
        }
    }
}
