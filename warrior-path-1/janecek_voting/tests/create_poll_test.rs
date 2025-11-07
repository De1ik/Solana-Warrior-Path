mod helpers;
use helpers::{setup_test_env, create_poll};
use janecek_voting::state::{PollState, VotingPhase};
use borsh::{BorshDeserialize};
use solana_sdk::{signer::Signer};


#[tokio::test]
async fn test_create_poll_success() {
    let (mut ctx, program_id) = setup_test_env().await;
    let payer = &ctx.payer;
    let recent_blockhash = ctx.last_blockhash;

    let title = "Presidential Election".to_string();
    let description = "Vote for the next president".to_string();

    let poll_pda = create_poll(
        &mut ctx.banks_client, 
        &payer, 
        &recent_blockhash, 
        &program_id, &title, 
        &description
    ).await;

    let poll_state = PollState::try_from_slice(&ctx.banks_client.get_account(poll_pda).await.unwrap().unwrap().data).unwrap();

    assert_eq!(poll_state.title, title);
    assert_eq!(poll_state.description, description);
    assert_eq!(poll_state.phase as u8, VotingPhase::Registration as u8);
    assert_eq!(poll_state.owner, payer.pubkey());
    assert_eq!(poll_state.party_counter, 0);
}