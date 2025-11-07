use crate::error::JanecekError;
use crate::instruction::JanecekInstruction;
use crate::state::{PollState, PartyAccount, VoterAccount, VotingPhase, VoteType};
use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::clock::Clock;
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    msg,
    program::invoke_signed,
    program_error::ProgramError,
    pubkey::Pubkey,
    system_instruction,
    sysvar::{rent::Rent, Sysvar},
    system_program,
    hash::hash
};


pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let instruction = JanecekInstruction::unpack(instruction_data)?;
    match instruction {
        JanecekInstruction::CreatePoll {
            title,
            description,
        } => create_poll(program_id, accounts, title, description),
        
        JanecekInstruction::CreateParty {
            title,
        } => create_party(program_id, accounts, title),
        
        JanecekInstruction::InitiateOwnerTransfer {
            new_owner
        } => initiate_owner_transfer(program_id, accounts, new_owner),
    
        JanecekInstruction::AcceptOwnerTransfer {} => accept_owner_transfer(program_id, accounts),

        JanecekInstruction::StartVoting {
        } => start_voting(program_id, accounts),

        JanecekInstruction::Vote {
            vote_type,
        } => vote(program_id, accounts, vote_type),

        JanecekInstruction::EndVoting {
        } => end_voting(program_id, accounts),
    }
}


pub fn create_poll(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    title: String,
    description: String,
) -> ProgramResult {
    msg!("Creating poll...");
    msg!("Title: {}", title);
    msg!("Description: {}", description);

    if accounts.len() < 3 {
        msg!("Insufficient accounts provided");
        return Err(ProgramError::NotEnoughAccountKeys);
    }

    let account_info_iter = &mut accounts.iter();

    let initializer = next_account_info(account_info_iter)?;
    let poll_account = next_account_info(account_info_iter)?;
    let system_program_account = next_account_info(account_info_iter)?;

    if !initializer.is_signer {
        msg!("Missing required signature");
        return Err(ProgramError::MissingRequiredSignature);
    }

    if poll_account.owner != &system_program::ID && poll_account.owner != program_id {
        msg!("Account already assigned to another program");
        return Err(ProgramError::IncorrectProgramId);
    }

    // Validate poll PDA
    let title_hash = hash(title.as_bytes());
    let description_hash = hash(description.as_bytes());
    let (pda, bump_seed) = Pubkey::find_program_address(
        &[b"poll", title_hash.as_ref(), description_hash.as_ref()],
        program_id,
    );
    if pda != *poll_account.key {
        msg!("Invalid seeds for PDA :(");
        msg!("pda: {}", pda);
        msg!("poll_account.key: {}", poll_account.key);
        return Err(ProgramError::InvalidArgument);
    }
    
    // Create poll PDA
    let account_len: usize = PollState::get_account_size(&title, &description);
    let rent = Rent::get()?;
    let rent_lamports = rent.minimum_balance(account_len);
    let seeds: &[&[u8]] = &[ b"poll", title_hash.as_ref(), description_hash.as_ref(), &[bump_seed]];

    msg!("Start invoke-signed");

    invoke_signed(
        &system_instruction::create_account(
            initializer.key,
            poll_account.key,
            rent_lamports,
            account_len.try_into().unwrap(),
            program_id,
        ),
        &[
            initializer.clone(),
            poll_account.clone(),
            system_program_account.clone(),
        ],
        &[seeds],
    )?;
    
    msg!("PDA creation: {}", pda);

    let clock = Clock::get()?;
    // Initialize PollState
    let poll_state = PollState {
        discriminator: PollState::DISCRIMINATOR.to_string(),
        title,
        description,
        phase: VotingPhase::Registration,
        party_counter: 0,
        owner: *initializer.key,
        expected_new_owner: *initializer.key,
        created_at: clock.unix_timestamp,
        voting_start_at: 0,
    };
    msg!("Serializing poll_state: {:?}", poll_state);
    poll_state.serialize(&mut &mut poll_account.data.borrow_mut()[..])?;
    msg!("Poll state serialized");

    Ok(())
}


pub fn create_party(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    title: String
) -> ProgramResult {
    msg!("Creating party...");
    msg!("Title: {}", title);

    if accounts.len() < 4 {
        msg!("Insufficient accounts provided");
        return Err(ProgramError::NotEnoughAccountKeys);
    }

    let account_info_iter = &mut accounts.iter();

    let initializer = next_account_info(account_info_iter)?;
    let poll_account = next_account_info(account_info_iter)?;
    let party_account = next_account_info(account_info_iter)?;
    let system_program_account = next_account_info(account_info_iter)?;

    if !initializer.is_signer {
        msg!("Missing required signature");
        return Err(ProgramError::MissingRequiredSignature);
    }

    if poll_account.owner != program_id {
        msg!("Poll account not owned by program");
        return Err(ProgramError::IncorrectProgramId);
    }

    // Validate poll account is initialized
    let poll_data = poll_account.data.borrow();
    if poll_data.iter().all(|&b| b == 0) {
        msg!("Poll account not initialized");
        return Err(ProgramError::UninitializedAccount);
    }
    let poll_state = PollState::try_from_slice(&poll_data)?;
    drop(poll_data);

    // Only the current owner can initiate
    if poll_state.owner != *initializer.key {
        msg!("Only the current owner can create party");
        return Err(ProgramError::IllegalOwner);
    }

    // Only allow creating a party during registration phase
    if !matches!(poll_state.phase, VotingPhase::Registration) {
        msg!("Can only create party during registration phase");
        return Err(ProgramError::InvalidAccountData);
    }


    // Validate party PDA
    let party_title_hash = hash(title.as_bytes());
    let (party_pda, party_bump_seed) = Pubkey::find_program_address(
        &[b"party", poll_account.key.as_ref(), party_title_hash.as_ref()],
        program_id,
    );
    if party_pda != *party_account.key {
        msg!("Invalid seeds for PDA");
        return Err(ProgramError::InvalidArgument);
    }

    // Create party PDA 
    let account_len = PartyAccount::get_account_size(&title);
    let rent = Rent::get()?;
    let rent_lamport = rent.minimum_balance(account_len);
    let seeds = &[
        b"party",
        poll_account.key.as_ref(),
        party_title_hash.as_ref(),
        &[party_bump_seed],
    ];

    invoke_signed(
        &system_instruction::create_account(
            initializer.key,
            party_account.key,
            rent_lamport,
            account_len.try_into().unwrap(),
            program_id,
        ),
        &[
            initializer.clone(),
            party_account.clone(),
            system_program_account.clone(),
        ],
        &[seeds],
    )?;

    msg!("PDA creation: {}", party_pda);


    // Initialize PartyAccount
    let party_state = PartyAccount {
        discriminator: PartyAccount::DISCRIMINATOR.to_string(),
        poll_id: *poll_account.key,
        title,
        positive_votes: 0,
        negative_votes: 0,
    };
    party_state.serialize(&mut &mut party_account.data.borrow_mut()[..])?;
    msg!("Party state serialized");

    // Update PollState
    let mut poll_state = PollState::try_from_slice(&poll_account.data.borrow())?;
    poll_state.party_counter += 1;
    poll_state.serialize(&mut &mut poll_account.data.borrow_mut()[..])?;
    msg!("Poll state updated");

    Ok(())
}


pub fn initiate_owner_transfer(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    new_owner: Pubkey
) -> ProgramResult {
    msg!("Initiating owner transfer...");
    msg!("New owner: {}", new_owner);


    if accounts.len() < 2 {
        msg!("Insufficient accounts provided");
        return Err(ProgramError::NotEnoughAccountKeys);
    }

    let account_info_iter = &mut accounts.iter();

    let initializer = next_account_info(account_info_iter)?;
    let poll_account = next_account_info(account_info_iter)?;

    if !initializer.is_signer {
        msg!("Missing required signature");
        return Err(ProgramError::MissingRequiredSignature);
    }

    if poll_account.owner != program_id {
        msg!("Poll account not owned by program");
        return Err(ProgramError::IncorrectProgramId);
    }

    // Validate poll account is initialized
    let poll_data = poll_account.data.borrow();
    if poll_data.iter().all(|&b| b == 0) {
        msg!("Poll account not initialized");
        return Err(ProgramError::UninitializedAccount);
    }
    let mut poll_state = PollState::try_from_slice(&poll_account.data.borrow())?;
    drop(poll_data);

    // Only the current owner can initiate
    if poll_state.owner != *initializer.key {
        msg!("Only the current owner can initiate transfer");
        return Err(ProgramError::IllegalOwner);
    }

    // Update PollState
    poll_state.expected_new_owner = new_owner;
    poll_state.serialize(&mut &mut poll_account.data.borrow_mut()[..])?;
    msg!("Poll state updated");

    Ok(())
}


pub fn accept_owner_transfer(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
) -> ProgramResult {
    msg!("Accepting owner transfer...");

    if accounts.len() < 2 {
        msg!("Insufficient accounts provided");
        return Err(ProgramError::NotEnoughAccountKeys);
    }
    
    let account_info_iter = &mut accounts.iter();

    let initializer = next_account_info(account_info_iter)?;
    let poll_account = next_account_info(account_info_iter)?;

    if !initializer.is_signer {
        msg!("Missing required signature");
        return Err(ProgramError::MissingRequiredSignature);
    }

    if poll_account.owner != program_id {
        msg!("Poll account not owned by program");
        return Err(ProgramError::IncorrectProgramId);
    }

    // Validate poll account is initialized
    let poll_data = poll_account.data.borrow();
    if poll_data.iter().all(|&b| b == 0) {
        msg!("Poll account not initialized");
        return Err(ProgramError::UninitializedAccount);
    }
    let mut poll_state = PollState::try_from_slice(&poll_account.data.borrow())?;
    drop(poll_data);

    // Only the expacted owner can initiate
    if poll_state.expected_new_owner != *initializer.key {
        msg!("Only the expected owner can initiate transfer");
        return Err(ProgramError::IllegalOwner);
    }

    poll_state.owner = *initializer.key;
    poll_state.serialize(&mut &mut poll_account.data.borrow_mut()[..])?;

    msg!("Poll state updated");
    
    Ok(())
}


pub fn start_voting(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
) -> ProgramResult {
    msg!("Starting voting...");

    if accounts.len() < 2 {
        msg!("Insufficient accounts provided");
        return Err(ProgramError::NotEnoughAccountKeys);
    }

    let account_info_iter = &mut accounts.iter();

    let initializer = next_account_info(account_info_iter)?;
    let poll_account = next_account_info(account_info_iter)?;

    if !initializer.is_signer {
        msg!("Missing required signature");
        return Err(ProgramError::MissingRequiredSignature);
    }

    if poll_account.owner != program_id {
        msg!("Poll account not owned by program");
        return Err(ProgramError::IncorrectProgramId);
    }

    // Validate poll account is initialized
    let poll_data = poll_account.data.borrow();
    if poll_data.iter().all(|&b| b == 0) {
        msg!("Poll account not initialized");
        return Err(ProgramError::UninitializedAccount);
    }
    let mut poll_state = PollState::try_from_slice(&poll_account.data.borrow())?;
    drop(poll_data);
    
    // Only the current owner can initiate
    if poll_state.owner != *initializer.key {
        msg!("Only the current owner can initiate transfer");
        return Err(ProgramError::IllegalOwner);
    }

    // Only allow starting voting during registration phase
    if !matches!(poll_state.phase, VotingPhase::Registration) {
        msg!("Can only start voting during registration phase");
        return Err(ProgramError::InvalidAccountData);
    }
    
    let clock = Clock::get()?;
    let elapsed = clock.unix_timestamp - poll_state.created_at;

    #[cfg(feature = "test-mode")]
    const MIN_TIME_DELTA: i64 = 1;

    #[cfg(not(feature = "test-mode"))]
    const MIN_TIME_DELTA: i64 = 60 * 60 * 24;

    // Check that the registration period is not too short
    if elapsed < MIN_TIME_DELTA {
        msg!("Registration period must last at least 24 hours");
        return Err(JanecekError::RegistrationPhaseTooShort.into());
    }

    poll_state.phase = VotingPhase::Voting;
    poll_state.voting_start_at = clock.unix_timestamp;
    poll_state.serialize(&mut &mut poll_account.data.borrow_mut()[..])?;
    msg!("Poll state updated");
    
    Ok(())
}


pub fn vote(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    vote_type: VoteType
) -> ProgramResult {
    msg!("Voting...");

    if accounts.len() < 5 {
        msg!("Insufficient accounts provided");
        return Err(ProgramError::NotEnoughAccountKeys);
    }

    let account_info_iter = &mut accounts.iter();
    
    let initializer = next_account_info(account_info_iter)?;
    let poll_account = next_account_info(account_info_iter)?;
    let party_account = next_account_info(account_info_iter)?;
    let voter_account = next_account_info(account_info_iter)?;
    let system_program_account = next_account_info(account_info_iter)?;

    if !initializer.is_signer {
        msg!("Missing required signature");
        return Err(ProgramError::MissingRequiredSignature);
    }

    if poll_account.owner != program_id {
        msg!("Poll account not owned by program");
        return Err(ProgramError::IncorrectProgramId);
    }

    let poll_data = poll_account.data.borrow();

    if poll_data.iter().all(|&b| b == 0) {
        msg!("Poll account not initialized");
        return Err(ProgramError::UninitializedAccount);
    }

    let mut poll_state = PollState::try_from_slice(&poll_data)?;
    drop(poll_data);

    // Check Registration phase
    if !matches!(poll_state.phase, VotingPhase::Voting) {
        msg!("User can vote only during voting phase");
        return Err(ProgramError::InvalidAccountData);
    }

    // Check that the voting period is not finished
    let clock = Clock::get()?;
    let elapsed = clock.unix_timestamp - poll_state.created_at;


    #[cfg(feature = "test-mode")]
    const MIN_TIME_DELTA: i64 = 60;

    #[cfg(not(feature = "test-mode"))]
    const MIN_TIME_DELTA: i64 = 60 * 60 * 24 * 7;


    if elapsed > MIN_TIME_DELTA {
        msg!("Voting period is finished");
        poll_state.phase = VotingPhase::Results;
        poll_state.serialize(&mut &mut poll_account.data.borrow_mut()[..])?;
        return Ok(()); 
    }

    // Validate party account is initialized
    let party_data: std::cell::Ref<'_, &mut [u8]> = party_account.data.borrow();
    
    if party_data.iter().all(|&b| b == 0) {
        msg!("Party account not initialized");
        return Err(ProgramError::UninitializedAccount);
    }
    
    let mut party_state = PartyAccount::try_from_slice(&party_data)?;
    drop(party_data);


    // Validate voter account is initialized
    let voter_initialized = {
        let voter_data = voter_account.data.borrow();
        !voter_data.iter().all(|&b| b == 0)
    };
    
    if !voter_initialized {
        msg!("Voter account not initialized");
        
        // Compute voter PDA 
        let (voter_pda, voter_bump_seed) = Pubkey::find_program_address(
            &[b"voter", poll_account.key.as_ref(), initializer.key.as_ref()],
            program_id,
        );

        // Validate voter PDA
        if voter_pda != *voter_account.key {
            msg!("Invalid seeds for PDA");
            return Err(ProgramError::InvalidArgument);
        }

        // Create voter PDA 
        let account_len = VoterAccount::get_account_size();
        let rent = Rent::get()?;
        let rent_lamport = rent.minimum_balance(account_len);
        let seeds = &[
            b"voter",
            poll_account.key.as_ref(),
            initializer.key.as_ref(),
            &[voter_bump_seed],
        ];

        invoke_signed(
            &system_instruction::create_account(
                initializer.key,
                voter_account.key,
                rent_lamport,
                account_len.try_into().unwrap(),
                program_id,
            ),
            &[
                initializer.clone(),
                voter_account.clone(),
                system_program_account.clone(),
            ],
            &[seeds],
        )?;

        // Initialize VoterAccount
        let voter_state = VoterAccount {
            discriminator: VoterAccount::DISCRIMINATOR.to_string(),
            poll_key: *poll_account.key,
            voter_key: *initializer.key,
            positive_used: 0,
            negative_used: 0,
            voted_parties: Vec::new()
        };
    
        voter_state.serialize(&mut &mut voter_account.data.borrow_mut()[..])?;
        msg!("Voter serialized successfully");
        msg!("Voter state serialized");
    } 

    let mut voter_state = {
        let voter_data = voter_account.data.borrow();
        let mut slice: &[u8] = &voter_data;          // &mut &[u8]
        let vs = VoterAccount::deserialize(&mut slice)?;
        vs
    };

    // Only the current owner can initiate
    if voter_state.voter_key != *initializer.key {
        msg!("Only the owner of Voter account can vote");
        return Err(ProgramError::IllegalOwner);
    }

    // Can not vote twice
    if voter_state.voted_parties.contains(party_account.key) {
        msg!("Voter already voted for this party");
        return Err(JanecekError::AlreadyVoted.into());
    }

    match vote_type {
        VoteType::Positive => {
            if voter_state.positive_used >= 2 {
                return Err(JanecekError::NoPositiveVoice.into());
            }
            voter_state.positive_used += 1;
            msg!("Voter state updated");
        },

        VoteType::Negative => {
            if voter_state.negative_used >= 1 {
                return Err(JanecekError::NoNegativeVoice.into());
            }
            if voter_state.positive_used < 2 {
                return Err(JanecekError::MustUseAllPositiveVoices.into());
            }
            voter_state.negative_used += 1;
            msg!("Voter state updated");
        },
    }

    voter_state.voted_parties.push(*party_account.key);
    voter_state.serialize(&mut &mut voter_account.data.borrow_mut()[..])?;
    msg!("Voter serialized successfully");


    match vote_type {
        VoteType::Positive => {
            party_state.positive_votes += 1;
        },
        VoteType::Negative => {
            party_state.negative_votes += 1;
        },
    }

    party_state.serialize(&mut &mut party_account.data.borrow_mut()[..])?;
    
    Ok(())
}


pub fn end_voting(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
) -> ProgramResult {
    msg!("Ending voting... {} {}", program_id, accounts.len());

    // let account_info_iter = &mut accounts.iter();

    Ok(())
}