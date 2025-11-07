mod helpers;
use helpers::{setup_test_env, create_poll, create_party};
use janecek_voting::state::{PollState, PartyAccount};
use borsh::{BorshDeserialize};


#[tokio::test]
async fn test_create_party_success() {
    let (mut ctx, program_id) = setup_test_env().await;
    let payer = &ctx.payer;
    let recent_blockhash = ctx.last_blockhash;


    let poll_title = "Presidential Election".to_string();
    let poll_description = "Vote for the next president".to_string();

    let party_title = "Party A".to_string();

    let poll_pda = create_poll(
        &mut ctx.banks_client,
        &payer,
        &recent_blockhash,
        &program_id,
        &poll_title,
        &poll_description,
    ).await;

    let party_pda = create_party(
        &mut ctx.banks_client,
        &payer,
        &recent_blockhash,
        &program_id,
        &party_title,
        &poll_pda,
    ).await;

    let poll_state = PollState::try_from_slice(&ctx.banks_client.get_account(poll_pda).await.unwrap().unwrap().data).unwrap();
    let party_state = PartyAccount::try_from_slice(&ctx.banks_client.get_account(party_pda).await.unwrap().unwrap().data).unwrap();

    assert_eq!(poll_state.party_counter, 1);
    assert_eq!(party_state.title, party_title);
    assert_eq!(party_state.positive_votes, 0);
    assert_eq!(party_state.negative_votes, 0);
}