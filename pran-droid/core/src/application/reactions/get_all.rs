use crate::application::reactions::dtos::reaction_dto::ReactionDto;
use crate::domain::reactions::reaction_definition_repository::ReactionDefinitionRepository;

pub async fn get_all_reactions(repo: &dyn ReactionDefinitionRepository) -> Vec<ReactionDto> {
    repo.get_all().await.into_iter().map(From::from).collect()
}