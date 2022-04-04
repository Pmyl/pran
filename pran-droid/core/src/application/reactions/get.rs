use std::sync::Arc;
use std::fmt::Debug;
use thiserror::Error;
use crate::application::reactions::dtos::reaction_dto::ReactionDto;
use crate::domain::reactions::reaction::{Reaction, ReactionId};
use crate::domain::reactions::reaction_repository::{ReactionRepository};

pub struct GetReactionRequest {
    pub id: String
}

pub fn get_reaction(request: GetReactionRequest, repository: &Arc<dyn ReactionRepository>) -> Option<ReactionDto> {
    repository.get(&ReactionId(request.id)).map(|reaction| reaction.into())
}
