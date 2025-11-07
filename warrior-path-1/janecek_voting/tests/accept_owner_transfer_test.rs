mod helpers;
use helpers::{
    setup_test_env, 
    create_poll, 
    initiate_owner_transfer, 
    accept_owner_transfer
};
use janecek_voting::state::{PollState, VotingPhase};
use borsh::{BorshDeserialize};
use solana_sdk::{signature::Keypair, signer::Signer, system_instruction, transaction::Transaction};

#[tokio::test]
async fn test_accept_owner_transfer_success() {
    let (mut ctx, program_id) = setup_test_env().await;
    let payer = &ctx.payer;
    let recent_blockhash = ctx.last_blockhash;

    let poll_title = "Presidential Election".to_string();
    let poll_description = "Vote for the next president".to_string();

    let poll_pda = create_poll(
        &mut ctx.banks_client,
        &payer,
        &recent_blockhash,
        &program_id,
        &poll_title,
        &poll_description,
    ).await;

    let new_owner = Keypair::new();

    let transfer_ix = system_instruction::transfer(
        &payer.pubkey(),
        &new_owner.pubkey(),
        1_000_000_000, // 1 SOL
    );
    let tx = Transaction::new_signed_with_payer(
        &[transfer_ix],
        Some(&payer.pubkey()),
        &[&payer],
        recent_blockhash,
    );
    ctx.banks_client.process_transaction(tx).await.unwrap();

    initiate_owner_transfer(
        &mut ctx.banks_client,
        &payer,
        &recent_blockhash,
        &program_id,
        &new_owner.pubkey(),
        &poll_pda,
    ).await;

    accept_owner_transfer(
        &mut ctx.banks_client,
        &new_owner,
        &recent_blockhash,
        &program_id,
        &poll_pda,
    ).await;

    let poll_state = PollState::try_from_slice(&ctx.banks_client.get_account(poll_pda).await.unwrap().unwrap().data).unwrap();
    assert_eq!(poll_state.phase as u8, VotingPhase::Registration as u8);
    assert_eq!(poll_state.owner, new_owner.pubkey());
    assert_eq!(poll_state.expected_new_owner, new_owner.pubkey());
}