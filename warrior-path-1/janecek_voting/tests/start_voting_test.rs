mod helpers;
use helpers::{setup_test_env, create_poll, start_voting};
use janecek_voting::state::{PollState, VotingPhase};
use borsh::{BorshDeserialize};
use solana_sdk::{clock::Clock};


#[tokio::test]
async fn test_start_voting_success() {
    let (mut ctx, program_id) = setup_test_env().await;

    let poll_title = "Presidential Election".to_string();
    let poll_description = "Vote for the next president".to_string();

    let poll_pda = create_poll(
        &mut ctx.banks_client,
        &ctx.payer,
        &ctx.last_blockhash,
        &program_id,
        &poll_title,
        &poll_description,
    ).await;


    let mut clock: Clock = ctx.banks_client.get_sysvar().await.unwrap();
    clock.unix_timestamp += (60 * 60 * 24) + 60;

    ctx.set_sysvar(&clock);

    start_voting(
        &mut ctx.banks_client,
        &ctx.payer,
        &ctx.last_blockhash,
        &program_id,
        &poll_pda,
    ).await;

    let poll_account = ctx.banks_client.get_account(poll_pda).await.unwrap().unwrap();
    let poll_state = PollState::try_from_slice(&poll_account.data).unwrap();
    assert_eq!(poll_state.phase as u8, VotingPhase::Voting as u8);
}