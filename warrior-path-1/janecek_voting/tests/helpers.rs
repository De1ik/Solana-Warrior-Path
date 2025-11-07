use solana_program_test::*;
use solana_sdk::{
    instruction::{AccountMeta, Instruction},
    pubkey::Pubkey,
    signature::Keypair,
    signer::Signer,
    transaction::Transaction,
    hash::Hash,
};
use solana_program::{system_program, hash::hash};
use borsh::BorshSerialize;
use janecek_voting::{processor::process_instruction, state::VoteType};


pub async fn setup_test_env() -> (ProgramTestContext, Pubkey) {
    let program_id = Pubkey::new_unique();
    let program_test = ProgramTest::new(
        "janecek_voting",
        program_id,
        processor!(process_instruction)
    );

    let context = program_test.start_with_context().await;
    (context, program_id)
    // let (banks_client, payer, recent_blockhash) = program_test.start().await;
    // (banks_client, payer, recent_blockhash, program_id)
}


#[derive(BorshSerialize)]
struct CreatePollPayload {
    title: String,
    description: String,
}

pub async fn create_poll(
    banks_client: &mut BanksClient,
    payer: &Keypair,
    recent_blockhash: &Hash,
    program_id: &Pubkey,
    title: &str,
    description: &str,
) -> Pubkey {
    let title_hash = hash(title.as_bytes());
    let description_hash = hash(description.as_bytes());

    let (poll_pda, _bump_seeds) = Pubkey::find_program_address(
        &[b"poll", title_hash.as_ref(), description_hash.as_ref()],
        program_id
    );

    let mut data = vec![0u8]; // discriminator = 0 (CreatePoll)
    let payload = CreatePollPayload {
        title: title.to_string(),
        description: description.to_string(),
    };
    data.extend(payload.try_to_vec().expect("borsh serialize"));

    let ix = Instruction {
        program_id: *program_id,
        accounts: vec![
            AccountMeta::new(payer.pubkey(), true),
            AccountMeta::new(poll_pda, false),
            AccountMeta::new_readonly(system_program::id(), false),
        ],
        data: data,
    };

    let tx = Transaction::new_signed_with_payer(&[ix], Some(&payer.pubkey()), &[&payer], *recent_blockhash);
    banks_client.process_transaction(tx).await.unwrap();

    poll_pda
}


#[derive(BorshSerialize)]
struct CreatePartyPayload {
    title: String,
}

pub async fn create_party(
    banks_client: &mut BanksClient,
    payer: &Keypair,
    recent_blockhash: &Hash,
    program_id: &Pubkey,
    title: &str,
    poll_id: &Pubkey,
) -> Pubkey {
    let title_hash = hash(title.as_bytes());
    let (party_pda, _bump_seeds) = Pubkey::find_program_address(
        &[b"party", poll_id.as_ref(), title_hash.as_ref()],
        program_id
    );

    let mut data = vec![1u8]; // discriminator = 1 (CreateParty)
    let payload = CreatePartyPayload {
        title: title.to_string(),
    };
    data.extend(payload.try_to_vec().expect("borsh serialize"));

    let ix = Instruction {
        program_id: *program_id,
        accounts: vec![
            AccountMeta::new(payer.pubkey(), true),
            AccountMeta::new(*poll_id, false),
            AccountMeta::new(party_pda, false),
            AccountMeta::new_readonly(system_program::id(), false),
        ],
        data: data,
    };

    let tx = Transaction::new_signed_with_payer(&[ix], Some(&payer.pubkey()), &[&payer], *recent_blockhash);
    banks_client.process_transaction(tx).await.unwrap();

    party_pda
}


#[derive(BorshSerialize)]
struct InitiateOwnerTransferPayload {
    new_owner: Pubkey,
}

pub async fn initiate_owner_transfer(
    banks_client: &mut BanksClient,
    payer: &Keypair,
    recent_blockhash: &Hash,
    program_id: &Pubkey,
    new_owner: &Pubkey,
    poll_id: &Pubkey,
) -> Pubkey {
    let mut data = vec![2u8]; // discriminator = 2 (InitiateOwnerTransfer)
    let payload = InitiateOwnerTransferPayload {
        new_owner: *new_owner,
    };
    data.extend(payload.try_to_vec().expect("borsh serialize"));

    let ix = Instruction {
        program_id: *program_id,
        accounts: vec![
            AccountMeta::new(payer.pubkey(), true),
            AccountMeta::new(*poll_id, false),
        ],
        data: data,
    };
    let tx = Transaction::new_signed_with_payer(&[ix], Some(&payer.pubkey()), &[&payer], *recent_blockhash);
    banks_client.process_transaction(tx).await.unwrap();

    *poll_id
}


pub async fn accept_owner_transfer(
    banks_client: &mut BanksClient,
    payer: &Keypair,
    recent_blockhash: &Hash,
    program_id: &Pubkey,
    poll_id: &Pubkey,
) -> Pubkey {
    let data = vec![3u8]; // discriminator = 3 (AcceptOwnerTransfer)
    let ix = Instruction {
        program_id: *program_id,
        accounts: vec![
            AccountMeta::new(payer.pubkey(), true),
            AccountMeta::new(*poll_id, false),
        ],
        data: data,
    };
    let tx = Transaction::new_signed_with_payer(&[ix], Some(&payer.pubkey()), &[&payer], *recent_blockhash);
    banks_client.process_transaction(tx).await.unwrap();

    *poll_id
}


pub async fn start_voting(
    banks_client: &mut BanksClient,
    payer: &Keypair,
    recent_blockhash: &Hash,
    program_id: &Pubkey,
    poll_id: &Pubkey,
) -> Pubkey {
    let data = vec![4u8]; // discriminator = 4 (StartVoting)

    let ix = Instruction {
        program_id: *program_id,
        accounts: vec![
            AccountMeta::new(payer.pubkey(), true),
            AccountMeta::new(*poll_id, false),
        ],
        data: data,
    };
    let tx = Transaction::new_signed_with_payer(&[ix], Some(&payer.pubkey()), &[&payer], *recent_blockhash);
    banks_client.process_transaction(tx).await.unwrap();

    *poll_id
}


#[derive(BorshSerialize)]
struct VotePayload {
    vote_type: VoteType,
}

pub async fn vote(
    banks_client: &mut BanksClient,
    payer: &Keypair,
    recent_blockhash: &Hash,
    program_id: &Pubkey,
    poll_pda: &Pubkey,
    party_pda: &Pubkey,
    vote_type: VoteType,
) -> Pubkey {
    let (voter_pda, _bump_seeds) = Pubkey::find_program_address(
        &[b"voter", poll_pda.as_ref(), payer.pubkey().as_ref()],
        program_id
    );
    
    let mut data = vec![5u8]; // discriminator = 5 (Vote)
    let payload = VotePayload {
        vote_type: vote_type,
    };
    data.extend(payload.try_to_vec().expect("borsh serialize"));

    let ix = Instruction {
        program_id: *program_id,
        accounts: vec![
            AccountMeta::new(payer.pubkey(), true),
            AccountMeta::new(*poll_pda, false),
            AccountMeta::new(*party_pda, false),
            AccountMeta::new(voter_pda, false),
            AccountMeta::new_readonly(system_program::id(), false),
        ],
        data: data,
    };
    let tx = Transaction::new_signed_with_payer(&[ix], Some(&payer.pubkey()), &[&payer], *recent_blockhash);
    banks_client.process_transaction(tx).await.unwrap();

    voter_pda
}

pub async fn vote_expect_fail(
    banks_client: &mut BanksClient,
    payer: &Keypair,
    recent_blockhash: &Hash,
    program_id: &Pubkey,
    poll_pda: &Pubkey,
    party_pda: &Pubkey,
    vote_type: VoteType,
) -> solana_program_test::BanksClientError {
    let (voter_pda, _) = Pubkey::find_program_address(
        &[b"voter", poll_pda.as_ref(), payer.pubkey().as_ref()],
        program_id
    );

    let mut data = vec![5u8];
    let payload = VotePayload { vote_type };
    data.extend(payload.try_to_vec().unwrap());

    let ix = Instruction {
        program_id: *program_id,
        accounts: vec![
            AccountMeta::new(payer.pubkey(), true),
            AccountMeta::new(*poll_pda, false),
            AccountMeta::new(*party_pda, false),
            AccountMeta::new(voter_pda, false),
            AccountMeta::new_readonly(system_program::id(), false),
        ],
        data,
    };

    let tx = Transaction::new_signed_with_payer(
        &[ix],
        Some(&payer.pubkey()),
        &[payer],
        *recent_blockhash,
    );

    banks_client.process_transaction(tx).await.unwrap_err()
}
