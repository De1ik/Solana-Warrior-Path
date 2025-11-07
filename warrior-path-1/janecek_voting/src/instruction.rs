use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{program_error::ProgramError, pubkey::Pubkey};
use crate::state::VoteType;

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub enum JanecekInstruction {
    CreatePoll {
        title: String,
        description: String,
    },
    CreateParty {
        title: String,
    },
    InitiateOwnerTransfer {
        new_owner: Pubkey,
    },
    AcceptOwnerTransfer {
    },
    StartVoting {
    },
    Vote {
        vote_type: VoteType,   
    },
    EndVoting {
    }
}

#[derive(BorshDeserialize)]
struct CreatePollPayload {
    title: String,
    description: String,
}

#[derive(BorshDeserialize)]
struct CreatePartyPayload {
    title: String
}

#[derive(BorshDeserialize)]
struct InitiateOwnerTransferPayload {
    new_owner: Pubkey
}

#[derive(BorshDeserialize)]
struct VotePayload {
    vote_type: VoteType,
}


impl JanecekInstruction {
    pub fn unpack(input: &[u8]) -> Result<Self, ProgramError> {
        let (&discriminator, rest) = input.split_first().ok_or(ProgramError::InvalidInstructionData)?;

        match discriminator {
            0 => { // CreatePoll
                let payload = CreatePollPayload::try_from_slice(rest)
                    .map_err(|_| ProgramError::InvalidInstructionData)?;
                Ok(Self::CreatePoll { 
                    title: payload.title, 
                    description: payload.description 
                })
            }
            1 => { // CreateParty
                let payload = CreatePartyPayload::try_from_slice(rest)
                    .map_err(|_| ProgramError::InvalidInstructionData)?;
                Ok(Self::CreateParty {
                    title: payload.title
                })
            }
            2 => { // InitiateOwnerTransfer
                let payload = InitiateOwnerTransferPayload::try_from_slice(rest)
                    .map_err(|_| ProgramError::InvalidInstructionData)?;
                Ok(Self::InitiateOwnerTransfer { 
                    new_owner: payload.new_owner
                })
            }
            3 => { // AcceptOwnerTransfer
                Ok(Self::AcceptOwnerTransfer {})
            }
            4 => { // StartVoting
                Ok(Self::StartVoting {})
            }
            5 => { // Vote
                let payload = VotePayload::try_from_slice(rest)
                    .map_err(|_| ProgramError::InvalidInstructionData)?;
                Ok(Self::Vote { 
                    vote_type: payload.vote_type
                })
            }
            6 => { // EndVoting
                Ok(Self::EndVoting {})
            }
            _ => return Err(ProgramError::InvalidInstructionData),
        }
    }
}