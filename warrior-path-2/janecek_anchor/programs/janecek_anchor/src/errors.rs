use anchor_lang::prelude::*;


#[error_code]
pub enum JanecekError {
    #[msg("Invalid instruction")]
    InvalidInstruction,
    #[msg("Title can not exceed 32 symbols")]
    InvalidTitleLength,
    #[msg("Description van not exceed 280 symbols")]
    InvalidDescriptionLength,
    #[msg("Mint account already initialized.")]
    MintAlreadyExists,
    #[msg("Invalid mint owner.")]
    InvalidMintOwner,
    #[msg("Poll title hash mismatch")]
    PollTitleHashMismatch,
    #[msg("Poll description hash mismatch")]
    PollDescriptionHashMismatch,
    #[msg("Unauthorized")]
    Unauthorized,

    #[msg("Invalid poll address")]
    InvalidPollAddress,

    #[msg("Counter overflow")]
    CounterOverflow,

    #[msg("Not in registration phase")]
    NotInRegistrationPhase,
    #[msg("Registration must be minimum 24h")]
    RegistrationPhaseTooShort,
    #[msg("Not in voting phase")]
    NotInVotingPhase,
    #[msg("voting was not finished")]
    VotingWasNotFinished,
    #[msg("voting was finished")]
    VotingWasFinished,

    #[msg("Rewards are disabled")]
    RewardsDisabled,

    #[msg("Invalid mint address")]
    InvalidMint,

    #[msg("Voting period is finished")]
    VotingPeriodFinished,
    #[msg("Voter do not have positive voice")]
    NoPositiveVoice,
    #[msg("Voter do not have negative voice")]
    NoNegativeVoice,
    #[msg("Voter already voted for this party")]
    AlreadyVoted,
    #[msg("Voter must use all positive voices")]
    MustUseAllPositiveVoices,
    #[msg("All votes were used")]
    TooManyVotes,
}