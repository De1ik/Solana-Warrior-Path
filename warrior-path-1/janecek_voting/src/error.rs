use solana_program::program_error::ProgramError;
use thiserror::Error;

#[derive(Error, Debug, Copy, Clone)]
pub enum JanecekError {
    #[error("Invalid instruction")]
    InvalidInstruction,
    #[error("Input data exceeds max length")]
    InvalidDataLength,
    #[error("Registration must be minimum 24h")]
    RegistrationPhaseTooShort,
    #[error("Voting period is finished")]
    VotingPeriodFinished,
    #[error("Voter do not have positive voice")]
    NoPositiveVoice,
    #[error("Voter do not have negative voice")]
    NoNegativeVoice,
    #[error("Voter already voted for this party")]
    AlreadyVoted,
    #[error("Voter must use all positive voices")]
    MustUseAllPositiveVoices,
}

impl From<JanecekError> for ProgramError {
    fn from(e: JanecekError) -> Self {
        ProgramError::Custom(e as u32)
    }
}
