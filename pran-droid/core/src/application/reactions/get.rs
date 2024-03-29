use crate::application::reactions::dtos::reaction_dto::ReactionDto;
use crate::domain::reactions::reaction_definition::{ReactionDefinitionId};
use crate::domain::reactions::reaction_definition_repository::{ReactionDefinitionRepository};

pub struct GetReactionRequest {
    pub id: String
}

pub async fn get_reaction(request: GetReactionRequest, repository: &dyn ReactionDefinitionRepository) -> Option<ReactionDto> {
    repository.get(&ReactionDefinitionId(request.id)).await.map(|reaction| reaction.into())
}
