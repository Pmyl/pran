use std::sync::Arc;
use crate::application::reactions::dtos::reaction_dto::ReactionDto;
use crate::domain::reactions::reaction::{ReactionId};
use crate::domain::reactions::reaction_repository::{ReactionRepository};

pub struct GetReactionRequest {
    pub id: String
}

pub fn get_reaction(request: GetReactionRequest, repository: &Arc<dyn ReactionRepository>) -> Option<ReactionDto> {
    repository.get(&ReactionId(request.id)).map(|reaction| reaction.into())
}