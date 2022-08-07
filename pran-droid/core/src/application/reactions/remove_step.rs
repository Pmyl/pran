use thiserror::Error;
use crate::domain::reactions::reaction_definition::ReactionDefinitionId;
use crate::domain::reactions::reaction_definition_repository::ReactionDefinitionRepository;

#[derive(Debug, Error)]
pub enum RemoveStepFromReactionError {
    #[error("Bad request")]
    BadRequest(String),
    #[error("Requested main aggregate not existing")]
    NotExistingMainAggregate,
}

pub struct RemoveStepFromReactionRequest {
    pub reaction_id: String,
    pub step_index: usize
}

pub async fn remove_step_from_reaction(request: RemoveStepFromReactionRequest, repository: &dyn ReactionDefinitionRepository) -> Result<(), RemoveStepFromReactionError> {
    let mut reaction_definition = repository.get(&ReactionDefinitionId(request.reaction_id)).await
        .ok_or_else(|| RemoveStepFromReactionError::NotExistingMainAggregate)?;

    reaction_definition.remove_step_at_index(request.step_index)
        .map_err(|_| RemoveStepFromReactionError::BadRequest(String::from("The requested step to remove does not exist")))?;

    repository.update(&reaction_definition).await.unwrap();

    Ok(())
}

#[cfg(test)]
mod tests {
    use std::borrow::Borrow;
    use std::sync::Arc;
    use crate::application::reactions::dtos::reaction_step_dto::{AnimationFrameDto, ReactionStepSkipDto};
    use crate::application::reactions::get::{get_reaction, GetReactionRequest};
    use crate::application::reactions::insert_movement_step::{insert_movement_step_to_reaction, InsertMovementStepToReactionRequest};
    use crate::domain::images::image_repository::ImageRepository;
    use crate::domain::images::image_repository::tests::setup_dummy_images;
    use crate::domain::reactions::reaction_definition_repository::tests::setup_dummy_chat_command_reaction_definition;
    use crate::persistence::images::in_memory_image_repository::InMemoryImageRepository;
    use crate::persistence::reactions::in_memory_reaction_repository::InMemoryReactionRepository;
    use super::*;

    #[tokio::test]
    async fn remove_step_from_reaction_reaction_not_existing_error() {
        let repository = InMemoryReactionRepository::new();
        let result = remove_step_from_reaction(RemoveStepFromReactionRequest { reaction_id: "not existing id".to_string(), step_index: 0 }, &repository).await;

        assert!(matches!(result, Err(RemoveStepFromReactionError::NotExistingMainAggregate)));
    }

    #[tokio::test]
    async fn remove_step_from_reaction_index_out_of_bounds_error() {
        let repository = InMemoryReactionRepository::new();
        let image_repository = InMemoryImageRepository::new();
        let reaction_definition = setup_dummy_chat_command_reaction_definition(&repository).await;
        setup_dummy_images(vec!["an image"], &image_repository).await;
        insert_movement_step_to_reaction(InsertMovementStepToReactionRequest {
            reaction_id: reaction_definition.id.0.clone(),
            step_index: 0,
            skip: ReactionStepSkipDto::ImmediatelyAfter,
            animation: vec![AnimationFrameDto { frame_start: 0, frame_end: 10, image_id: String::from("an image") }]
        }, &repository, &image_repository).await.expect("inserting step as part of test arrangement should not fail");

        let result = remove_step_from_reaction(RemoveStepFromReactionRequest { reaction_id: reaction_definition.id.0, step_index: 1 }, &repository).await;

        assert!(matches!(result, Err(RemoveStepFromReactionError::BadRequest(_))), "Should be error, it's actually {:?}", result);
    }

    #[tokio::test]
    async fn remove_step_from_reaction_index_exists_remove_step_and_save() {
        let repository = InMemoryReactionRepository::new();
        let image_repository = InMemoryImageRepository::new();
        let reaction_definition = setup_dummy_chat_command_reaction_definition(&repository).await;
        setup_dummy_images(vec!["an image"], &image_repository).await;
        insert_movement_step_to_reaction(InsertMovementStepToReactionRequest {
            reaction_id: reaction_definition.id.0.clone(),
            step_index: 0,
            skip: ReactionStepSkipDto::ImmediatelyAfter,
            animation: vec![AnimationFrameDto { frame_start: 0, frame_end: 10, image_id: String::from("an image") }]
        }, &repository, &image_repository).await.expect("inserting step as part of test arrangement should not fail");

        remove_step_from_reaction(RemoveStepFromReactionRequest { reaction_id: reaction_definition.id.0.clone(), step_index: 0 }, &repository).await
            .expect("Removing existing step in reaction should not fail");

        let reaction_definition = get_reaction(GetReactionRequest { id: reaction_definition.id.0 }, &repository).await.unwrap();
        assert_eq!(reaction_definition.steps.len(), 0);
    }
}