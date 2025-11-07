mod helpers;
use helpers::{setup_test_env, create_poll, create_party, vote, start_voting, vote_expect_fail};
use janecek_voting::state::{PollState, VoteType, VotingPhase, PartyAccount, VoterAccount};
use borsh::{BorshDeserialize};
use solana_sdk::{clock::Clock, signature::Keypair, signer::Signer, system_instruction, transaction::{Transaction, TransactionError}, instruction::InstructionError};

#[tokio::test]
async fn test_vote_success() {
    let (mut ctx, program_id) = setup_test_env().await;

    // data for pda generation
    let title = "Presidential Election".to_string();
    let description = "Vote for the next president".to_string();
    let title_A = "Party A".to_string();
    let title_B = "Party B".to_string();
    let title_C = "Party C".to_string();
    let title_D = "Party D".to_string();
    let voter = Keypair::new();
    

    // transfer SOL to voter
    let transfer_ix_1 = system_instruction::transfer(
        &ctx.payer.pubkey(),
        &voter.pubkey(),
        1_000_000, // 1 SOL
    );

    let tx = Transaction::new_signed_with_payer(
        &[transfer_ix_1],
        Some(&ctx.payer.pubkey()),
        &[&ctx.payer],
        ctx.last_blockhash,
    );
    ctx.banks_client.process_transaction(tx).await.unwrap();


    // create poll
    let poll_pda = create_poll(
        &mut ctx.banks_client,
        &ctx.payer,
        &ctx.last_blockhash,
        &program_id,
        &title,
        &description,
    ).await;


    // create parties
    let party_pda_A = create_party(
        &mut ctx.banks_client,
        &ctx.payer,
        &ctx.last_blockhash,
        &program_id,
        &title_A,
        &poll_pda,
    ).await;

    let party_pda_B = create_party(
        &mut ctx.banks_client,
        &ctx.payer,
        &ctx.last_blockhash,
        &program_id,
        &title_B,
        &poll_pda,
    ).await;

    let party_pda_C = create_party(
        &mut ctx.banks_client,
        &ctx.payer,
        &ctx.last_blockhash,
        &program_id,
        &title_C,
        &poll_pda,
    ).await;

    let party_pda_D = create_party(
        &mut ctx.banks_client,
        &ctx.payer,
        &ctx.last_blockhash,
        &program_id,
        &title_D,
        &poll_pda,
    ).await;


    // update timestamp to 24 hours and 1 minute
    let mut clock: Clock = ctx.banks_client.get_sysvar().await.unwrap();
    clock.unix_timestamp += (60 * 60 * 24) + 60;
    ctx.set_sysvar(&clock);

    // start voting
    start_voting(
        &mut ctx.banks_client,
        &ctx.payer,
        &ctx.last_blockhash,
        &program_id,
        &poll_pda,
    ).await;

    // vote for party A
    vote(
        &mut ctx.banks_client,
        &ctx.payer,
        &ctx.last_blockhash,
        &program_id,
        &poll_pda,
        &party_pda_A,
        VoteType::Positive,
    ).await;

    // update blockhash
    ctx.last_blockhash = ctx.banks_client.get_latest_blockhash().await.unwrap();

    // expect error when user try to vote for the same party again
    let err = vote_expect_fail(
        &mut ctx.banks_client,
        &ctx.payer,
        &ctx.last_blockhash,
        &program_id,
        &poll_pda,
        &party_pda_A,
        VoteType::Positive,
    ).await.unwrap();

    match err {
        TransactionError::InstructionError(_, InstructionError::Custom(code)) => {
            assert_eq!(
                code,
                janecek_voting::error::JanecekError::AlreadyVoted as u32,
                "Expected error when user try to vote for the same party again"
            );
        }
        other => panic!("Unexpected transport error type: {:?}", other),
    }

    // expect error when user try to vote with Negative voice, when he has not used all positive voices
    let err = vote_expect_fail(
        &mut ctx.banks_client,
        &ctx.payer,
        &ctx.last_blockhash,
        &program_id,
        &poll_pda,
        &party_pda_B,
        VoteType::Negative,
    ).await.unwrap();

    match err {
        TransactionError::InstructionError(_, InstructionError::Custom(code)) => {
            assert_eq!(
                code,
                janecek_voting::error::JanecekError::MustUseAllPositiveVoices as u32,
                "Expected error when user try to vote with Negative voice, when he has not used all positive voices"
            );
        }
        other => panic!("Unexpected transport error type: {:?}", other),
    }

    // vote for party B
    vote(
        &mut ctx.banks_client,
        &ctx.payer,
        &ctx.last_blockhash,
        &program_id,
        &poll_pda,
        &party_pda_B,
        VoteType::Positive,
    ).await;

    // vote for party C
    let voter_pda = vote(
        &mut ctx.banks_client,
        &ctx.payer,
        &ctx.last_blockhash,
        &program_id,
        &poll_pda,
        &party_pda_C,
        VoteType::Negative,
    ).await;

    // update blockhash
    ctx.last_blockhash = ctx.banks_client.get_latest_blockhash().await.unwrap();

    // expect error when user try to vote for party D with Positive voice, when he has not used all negative voices
    let err = vote_expect_fail(
        &mut ctx.banks_client,
        &ctx.payer,
        &ctx.last_blockhash,
        &program_id,
        &poll_pda,
        &party_pda_D,
        VoteType::Positive,
    ).await.unwrap();

    match err {
        TransactionError::InstructionError(_, InstructionError::Custom(code)) => {
            assert_eq!(
                code,
                janecek_voting::error::JanecekError::NoPositiveVoice as u32,
                "Expected NoPositiveVoice error"
            );
        }
        other => panic!("Unexpected transport error type: {:?}", other),
    }


    // expect error when user try to vote for party D with Negative voice, when he has not used all positive voices
    let err = vote_expect_fail(
        &mut ctx.banks_client,
        &ctx.payer,
        &ctx.last_blockhash,
        &program_id,
        &poll_pda,
        &party_pda_D,
        VoteType::Negative,
    ).await.unwrap();

    match err {
        TransactionError::InstructionError(_, InstructionError::Custom(code)) => {
            assert_eq!(
                code,
                janecek_voting::error::JanecekError::NoNegativeVoice as u32,
                "Expected NoNegativeVoice error"
            );
        }
        other => panic!("Unexpected transport error type: {:?}", other),
    }

    let poll_account = ctx.banks_client.get_account(poll_pda).await.unwrap().unwrap();
    let poll_state = PollState::try_from_slice(&poll_account.data).unwrap();

    let party_account_A = ctx.banks_client.get_account(party_pda_A).await.unwrap().unwrap();
    let party_state_A = PartyAccount::try_from_slice(&party_account_A.data).unwrap();

    let party_account_B = ctx.banks_client.get_account(party_pda_B).await.unwrap().unwrap();
    let party_state_B = PartyAccount::try_from_slice(&party_account_B.data).unwrap();

    let party_account_C = ctx.banks_client.get_account(party_pda_C).await.unwrap().unwrap();
    let party_state_C = PartyAccount::try_from_slice(&party_account_C.data).unwrap();

    let party_account_D = ctx.banks_client.get_account(party_pda_D).await.unwrap().unwrap();
    let party_state_D = PartyAccount::try_from_slice(&party_account_D.data).unwrap();

    let voter_account = ctx.banks_client.get_account(voter_pda).await.unwrap().unwrap();
    let mut cursor = std::io::Cursor::new(&voter_account.data);
    let voter_state = VoterAccount::deserialize_reader(&mut cursor).unwrap();

    assert_eq!(poll_state.phase as u8, VotingPhase::Voting as u8);
    assert_eq!(poll_state.party_counter, 4);

    assert_eq!(party_state_A.positive_votes, 1);
    assert_eq!(party_state_A.negative_votes, 0);

    assert_eq!(party_state_B.positive_votes, 1);
    assert_eq!(party_state_B.negative_votes, 0);

    assert_eq!(party_state_C.positive_votes, 0);
    assert_eq!(party_state_C.negative_votes, 1);

    assert_eq!(party_state_D.positive_votes, 0);
    assert_eq!(party_state_D.negative_votes, 0);

    assert_eq!(voter_state.positive_used, 2);
    assert_eq!(voter_state.negative_used, 1);
    assert_eq!(voter_state.voted_parties.len(), 3);
    assert_eq!(voter_state.voted_parties[0], party_pda_A);
    assert_eq!(voter_state.voted_parties[1], party_pda_B);
    assert_eq!(voter_state.voted_parties[2], party_pda_C);

}

#[tokio::test]
async fn test_vote_after_voting_period() {
    let (mut ctx, program_id) = setup_test_env().await;

    // data for pda generation
    let title = "Presidential Election".to_string();
    let description = "Vote for the next president".to_string();
    let title_A = "Party A".to_string();
    let voter = Keypair::new();
    

    // transfer SOL to voter
    let transfer_ix_1 = system_instruction::transfer(
        &ctx.payer.pubkey(),
        &voter.pubkey(),
        1_000_000, // 1 SOL
    );

    let tx = Transaction::new_signed_with_payer(
        &[transfer_ix_1],
        Some(&ctx.payer.pubkey()),
        &[&ctx.payer],
        ctx.last_blockhash,
    );
    ctx.banks_client.process_transaction(tx).await.unwrap();


    // create poll
    let poll_pda = create_poll(
        &mut ctx.banks_client,
        &ctx.payer,
        &ctx.last_blockhash,
        &program_id,
        &title,
        &description,
    ).await;


    // create parties
    let party_pda_A = create_party(
        &mut ctx.banks_client,
        &ctx.payer,
        &ctx.last_blockhash,
        &program_id,
        &title_A,
        &poll_pda,
    ).await;

    // update timestamp to 24 hours and 1 minute
    let mut clock: Clock = ctx.banks_client.get_sysvar().await.unwrap();
    clock.unix_timestamp += (60 * 60 * 24) + 60;
    ctx.set_sysvar(&clock);

    // start voting
    start_voting(
        &mut ctx.banks_client,
        &ctx.payer,
        &ctx.last_blockhash,
        &program_id,
        &poll_pda,
    ).await;

    // update blockhash
    ctx.last_blockhash = ctx.banks_client.get_latest_blockhash().await.unwrap();

    // update timestamp to 7 days and 1 minute
    let mut clock: Clock = ctx.banks_client.get_sysvar().await.unwrap();
    clock.unix_timestamp += (60 * 60 * 24 * 7) + 60;
    ctx.set_sysvar(&clock);

    // expect tx without error when user try to vote after voting period, but it will not be counted, just update Vote state
    vote(
        &mut ctx.banks_client,
        &ctx.payer,
        &ctx.last_blockhash,
        &program_id,
        &poll_pda,
        &party_pda_A,
        VoteType::Positive,
    ).await;
    

    let poll_account = ctx.banks_client.get_account(poll_pda).await.unwrap().unwrap();
    let poll_state = PollState::try_from_slice(&poll_account.data).unwrap();

    let party_account_A = ctx.banks_client.get_account(party_pda_A).await.unwrap().unwrap();
    let party_state_A = PartyAccount::try_from_slice(&party_account_A.data).unwrap();

    assert_eq!(poll_state.party_counter, 1);

    assert_eq!(party_state_A.positive_votes, 0);
    assert_eq!(party_state_A.negative_votes, 0);

    assert_eq!(poll_state.phase as u8, VotingPhase::Results as u8);

}


