use std::sync::Arc;
use std::fmt::Debug;
use thiserror::Error;
use crate::application::reactions::dtos::reaction_step_dto::{AnimationFrameDto, frames_dtos_to_animation, ReactionStepDto, ReactionStepSkipDto};
use crate::domain::animations::animation::{CreateAnimationError};
use crate::domain::reactions::reaction_definition::{MovingReactionStepDefinition, ReactionDefinition, ReactionDefinitionId};
use crate::domain::reactions::reaction_domain_service::{add_moving_step_to_reaction, AddStepToReactionError, replace_moving_step_in_reaction};
use crate::domain::reactions::reaction_definition_repository::ReactionDefinitionRepository;
use crate::domain::images::image_repository::ImageRepository;

#[derive(Debug, Error)]
pub enum AddMovementStepToReactionError {
    #[error("Bad request")]
    BadRequest(String),
    #[error("Wrong animation details")]
    WrongAnimationRequest(#[from] CreateAnimationError),
    #[error("Wrong image details")]
    BadImageRequest(#[from] AddStepToReactionError),
}

pub struct InsertMovementStepToReactionRequest {
    pub reaction_id: String,
    pub step_index: usize,
    pub animation: Vec<AnimationFrameDto>,
    pub skip: ReactionStepSkipDto
}

pub async fn insert_movement_step_to_reaction(request: InsertMovementStepToReactionRequest, repository: &Arc<dyn ReactionDefinitionRepository>, image_repository: &Arc<dyn ImageRepository>) -> Result<ReactionStepDto, AddMovementStepToReactionError> {
    let mut reaction = repository.get(&ReactionDefinitionId(request.reaction_id.clone())).await
        .ok_or_else(|| AddMovementStepToReactionError::BadRequest(String::from("The requested reaction id does not exist")))?;

    let reaction_step = MovingReactionStepDefinition {
        skip: request.skip.into(),
        animation: frames_dtos_to_animation(request.animation)?
    };
    insert_step_in_correct_index(&mut reaction, reaction_step.clone(), request.step_index, image_repository).await?;
    repository.update(&reaction).await.unwrap();

    Ok(reaction_step.into())
}

async fn insert_step_in_correct_index(reaction: &mut ReactionDefinition, reaction_step: MovingReactionStepDefinition, step_index: usize, image_repository: &Arc<dyn ImageRepository>) -> Result<(), AddMovementStepToReactionError> {
    if step_index > reaction.steps.len() {
        return Err(AddMovementStepToReactionError::BadRequest(String::from("Index out of bounds")));
    } else if step_index == reaction.steps.len() {
        add_moving_step_to_reaction(reaction, reaction_step, image_repository).await?;
    } else {
        replace_moving_step_in_reaction(reaction, reaction_step, step_index, image_repository).await?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::application::reactions::get::{get_reaction, GetReactionRequest};
    use crate::persistence::reactions::in_memory_reaction_repository::InMemoryReactionRepository;
    use crate::application::reactions::dtos::reaction_step_dto::{MovingReactionStepDto, ReactionStepSkipDto};
    use crate::domain::images::image_repository::tests::setup_dummy_images;
    use crate::domain::reactions::reaction_definition_repository::tests::setup_dummy_chat_command_reaction_definition;
    use crate::persistence::images::in_memory_image_repository::InMemoryImageRepository;

    #[tokio::test]
    async fn insert_movement_step_to_reaction_wrong_id_return_error() {
        let repository: Arc<dyn ReactionDefinitionRepository> = Arc::new(InMemoryReactionRepository::new());
        let image_repo: Arc<dyn ImageRepository> = Arc::new(InMemoryImageRepository::new());
        setup_dummy_chat_command_reaction_definition(&repository).await;

        let result = insert_movement_step_to_reaction(InsertMovementStepToReactionRequest {
            reaction_id: String::from("new id"),
            step_index: 0,
            skip: ReactionStepSkipDto::ImmediatelyAfter,
            animation: vec![]
        }, &repository, &image_repo).await;

        assert!(matches!(result, Err(AddMovementStepToReactionError::BadRequest(_))), "Expected insert step to fail with bad request");
    }

    #[tokio::test]
    async fn insert_movement_step_to_reaction_empty_animation_store_in_repository() {
        let repository: Arc<dyn ReactionDefinitionRepository> = Arc::new(InMemoryReactionRepository::new());
        let image_repo: Arc<dyn ImageRepository> = Arc::new(InMemoryImageRepository::new());
        let reaction = setup_dummy_chat_command_reaction_definition(&repository).await;

        insert_movement_step_to_reaction(InsertMovementStepToReactionRequest {
            reaction_id: reaction.id.0.clone(),
            step_index: 0,
            skip: ReactionStepSkipDto::ImmediatelyAfter,
            animation: vec![]
        }, &repository, &image_repo).await.expect("Expected insert step not to fail");

        let reaction = get_reaction(GetReactionRequest { id: reaction.id.0 }, &repository).await.expect("Expected reaction to exists");
        assert_eq!(reaction.steps.len(), 1);
    }

    #[tokio::test]
    async fn insert_movement_step_to_reaction_correctly_map_the_animation_of_movement_step() {
        let repository: Arc<dyn ReactionDefinitionRepository> = Arc::new(InMemoryReactionRepository::new());
        let image_repo: Arc<dyn ImageRepository> = Arc::new(InMemoryImageRepository::new());
        let reaction = setup_dummy_chat_command_reaction_definition(&repository).await;
        setup_dummy_images(vec!["id1", "id2"], &image_repo).await;

        insert_movement_step_to_reaction(InsertMovementStepToReactionRequest {
            reaction_id: reaction.id.0.clone(),
            step_index: 0,
            skip: ReactionStepSkipDto::ImmediatelyAfter,
            animation: vec![AnimationFrameDto {
                frame_start: 10,
                frame_end: 20,
                image_id: String::from("id1")
            }, AnimationFrameDto {
                frame_start: 21,
                frame_end: 30,
                image_id: String::from("id2")
            }]
        }, &repository, &image_repo).await.expect("Expected insert step not to fail");

        let moving_step = get_moving_animation_step_at(&repository, reaction.id.0, 0).await;
        let (first_frame, second_frame) = (
            moving_step.animation.get(0).expect("expected frame 1"),
            moving_step.animation.get(1).expect("expected frame 2")
        );
        assert_eq!(first_frame.frame_start, 10);
        assert_eq!(first_frame.frame_end, 20);
        assert_eq!(first_frame.image_id, String::from("id1"));

        assert_eq!(second_frame.frame_start, 21);
        assert_eq!(second_frame.frame_end, 30);
        assert_eq!(second_frame.image_id, String::from("id2"));
    }

    #[tokio::test]
    async fn insert_movement_step_to_reaction_with_non_existing_image_id_errors() {
        let repository: Arc<dyn ReactionDefinitionRepository> = Arc::new(InMemoryReactionRepository::new());
        let image_repo: Arc<dyn ImageRepository> = Arc::new(InMemoryImageRepository::new());
        let reaction = setup_dummy_chat_command_reaction_definition(&repository).await;

        let result = insert_movement_step_to_reaction(InsertMovementStepToReactionRequest {
            reaction_id: reaction.id.0.clone(),
            step_index: 0,
            skip: ReactionStepSkipDto::ImmediatelyAfter,
            animation: vec![AnimationFrameDto {
                frame_start: 10,
                frame_end: 20,
                image_id: String::from("not existing image id")
            }]
        }, &repository, &image_repo).await;

        assert!(matches!(result, Err(AddMovementStepToReactionError::BadImageRequest(_))), "Expected insert step to fail with bad image request");
    }

    #[tokio::test]
    async fn insert_movement_step_to_existing_index_with_non_existing_image_id_errors() {
        let repository: Arc<dyn ReactionDefinitionRepository> = Arc::new(InMemoryReactionRepository::new());
        let image_repo: Arc<dyn ImageRepository> = Arc::new(InMemoryImageRepository::new());
        let reaction = setup_dummy_chat_command_reaction_definition(&repository).await;
        setup_dummy_images(vec!["id1"], &image_repo).await;

        insert_movement_step_to_reaction(InsertMovementStepToReactionRequest {
            reaction_id: reaction.id.0.clone(),
            step_index: 0,
            skip: ReactionStepSkipDto::ImmediatelyAfter,
            animation: vec![AnimationFrameDto {
                frame_start: 10,
                frame_end: 20,
                image_id: String::from("id1")
            }]
        }, &repository, &image_repo).await.expect("Expected insert step not to fail");
        let replace_with_not_existing_image = insert_movement_step_to_reaction(InsertMovementStepToReactionRequest {
            reaction_id: reaction.id.0.clone(),
            step_index: 0,
            skip: ReactionStepSkipDto::ImmediatelyAfter,
            animation: vec![AnimationFrameDto {
                frame_start: 10,
                frame_end: 20,
                image_id: String::from("not existing image id")
            }]
        }, &repository, &image_repo).await;

        assert!(matches!(replace_with_not_existing_image, Err(AddMovementStepToReactionError::BadImageRequest(_))), "Expected insert step to fail with bad image request");
    }

    #[tokio::test]
    async fn insert_multiple_movement_steps_to_reaction_save_all_of_them_at_provided_index() {
        let repository: Arc<dyn ReactionDefinitionRepository> = Arc::new(InMemoryReactionRepository::new());
        let image_repo: Arc<dyn ImageRepository> = Arc::new(InMemoryImageRepository::new());
        let reaction = setup_dummy_chat_command_reaction_definition(&repository).await;
        setup_dummy_images(vec!["id1", "id2"], &image_repo).await;

        insert_movement_step_to_reaction(InsertMovementStepToReactionRequest {
            reaction_id: reaction.id.0.clone(),
            step_index: 0,
            skip: ReactionStepSkipDto::ImmediatelyAfter,
            animation: vec![AnimationFrameDto {
                frame_start: 10,
                frame_end: 20,
                image_id: String::from("id1")
            }]
        }, &repository, &image_repo).await.expect("Expected first insert step not to fail");

        insert_movement_step_to_reaction(InsertMovementStepToReactionRequest {
            reaction_id: reaction.id.0.clone(),
            step_index: 1,
            skip: ReactionStepSkipDto::ImmediatelyAfter,
            animation: vec![AnimationFrameDto {
                frame_start: 13,
                frame_end: 34,
                image_id: String::from("id2")
            }]
        }, &repository, &image_repo).await.expect("Expected second insert step not to fail");

        let first_moving_step = get_moving_animation_step_at(&repository, reaction.id.0.clone(), 0).await;
        let second_moving_step = get_moving_animation_step_at(&repository, reaction.id.0, 1).await;

        assert_eq!(first_moving_step.animation.len(), 1);
        let first_step_frame = first_moving_step.animation.get(0).unwrap();
        assert_eq!(first_step_frame.frame_start, 10);
        assert_eq!(first_step_frame.frame_end, 20);
        assert_eq!(first_step_frame.image_id, String::from("id1"));

        assert_eq!(second_moving_step.animation.len(), 1);
        let second_step_frame = second_moving_step.animation.get(0).unwrap();
        assert_eq!(second_step_frame.frame_start, 13);
        assert_eq!(second_step_frame.frame_end, 34);
        assert_eq!(second_step_frame.image_id, String::from("id2"));
    }

    #[tokio::test]
    async fn insert_movement_step_to_reaction_save_skip_configuration() {
        let repository: Arc<dyn ReactionDefinitionRepository> = Arc::new(InMemoryReactionRepository::new());
        let image_repo: Arc<dyn ImageRepository> = Arc::new(InMemoryImageRepository::new());
        let reaction = setup_dummy_chat_command_reaction_definition(&repository).await;
        setup_dummy_images(vec!["id1", "id2"], &image_repo).await;

        insert_movement_step_to_reaction(InsertMovementStepToReactionRequest {
            reaction_id: reaction.id.0.clone(),
            step_index: 0,
            animation: vec![AnimationFrameDto { frame_start: 10, frame_end: 20, image_id: String::from("id1") }],
            skip: ReactionStepSkipDto::ImmediatelyAfter,
        }, &repository, &image_repo).await.expect("Expected first insert step not to fail");

        insert_movement_step_to_reaction(InsertMovementStepToReactionRequest {
            reaction_id: reaction.id.0.clone(),
            step_index: 1,
            animation: vec![AnimationFrameDto { frame_start: 10, frame_end: 20, image_id: String::from("id2") }],
            skip: ReactionStepSkipDto::AfterMilliseconds(12),
        }, &repository, &image_repo).await.expect("Expected second insert step not to fail");

        let first_moving_step = get_moving_animation_step_at(&repository, reaction.id.0.clone(), 0).await;
        let second_moving_step = get_moving_animation_step_at(&repository, reaction.id.0, 1).await;

        match first_moving_step.skip {
            ReactionStepSkipDto::ImmediatelyAfter => {},
            _ => unreachable!("should have saved an immediate skip")
        }

        if let ReactionStepSkipDto::AfterMilliseconds(ms) = second_moving_step.skip {
            assert_eq!(ms, 12);
        } else {
            unreachable!("should have saved a timed skip");
        }
    }

    #[tokio::test]
    async fn insert_movement_step_to_an_index_detached_from_existing_steps_errors() {
        let repository: Arc<dyn ReactionDefinitionRepository> = Arc::new(InMemoryReactionRepository::new());
        let image_repo: Arc<dyn ImageRepository> = Arc::new(InMemoryImageRepository::new());
        let reaction = setup_dummy_chat_command_reaction_definition(&repository).await;
        setup_dummy_images(vec!["id1", "id2", "id3"], &image_repo).await;

        insert_movement_step_to_reaction(InsertMovementStepToReactionRequest {
            reaction_id: reaction.id.0.clone(),
            step_index: 0,
            animation: vec![AnimationFrameDto { frame_start: 10, frame_end: 20, image_id: String::from("id1") }],
            skip: ReactionStepSkipDto::ImmediatelyAfter,
        }, &repository, &image_repo).await.expect("Expected insert step not to fail");

        insert_movement_step_to_reaction(InsertMovementStepToReactionRequest {
            reaction_id: reaction.id.0.clone(),
            step_index: 1,
            animation: vec![AnimationFrameDto { frame_start: 10, frame_end: 20, image_id: String::from("id2") }],
            skip: ReactionStepSkipDto::AfterMilliseconds(12),
        }, &repository, &image_repo).await.expect("Expected insert step not to fail");

        let result_detached_step = insert_movement_step_to_reaction(InsertMovementStepToReactionRequest {
            reaction_id: reaction.id.0.clone(),
            step_index: 3,
            animation: vec![AnimationFrameDto { frame_start: 10, frame_end: 20, image_id: String::from("id3") }],
            skip: ReactionStepSkipDto::AfterMilliseconds(12),
        }, &repository, &image_repo).await;

        assert!(matches!(result_detached_step, Err(AddMovementStepToReactionError::BadRequest(_))), "Expected insert step to fail with bad request");
        try_get_animation_step_at(&repository, reaction.id.0.clone(), 2).await.expect_err("should not have added any step");
        try_get_animation_step_at(&repository, reaction.id.0, 3).await.expect_err("should not have added any step");
    }

    #[tokio::test]
    async fn insert_movement_step_to_an_index_right_after_existing_steps_at_index() {
        let repository: Arc<dyn ReactionDefinitionRepository> = Arc::new(InMemoryReactionRepository::new());
        let image_repo: Arc<dyn ImageRepository> = Arc::new(InMemoryImageRepository::new());
        let reaction = setup_dummy_chat_command_reaction_definition(&repository).await;
        setup_dummy_images(vec!["id1", "id2"], &image_repo).await;

        insert_movement_step_to_reaction(InsertMovementStepToReactionRequest {
            reaction_id: reaction.id.0.clone(),
            step_index: 0,
            animation: vec![AnimationFrameDto { frame_start: 10, frame_end: 20, image_id: String::from("id1") }],
            skip: ReactionStepSkipDto::ImmediatelyAfter,
        }, &repository, &image_repo).await.expect("Expected insert step not to fail");

        insert_movement_step_to_reaction(InsertMovementStepToReactionRequest {
            reaction_id: reaction.id.0.clone(),
            step_index: 1,
            animation: vec![AnimationFrameDto { frame_start: 10, frame_end: 20, image_id: String::from("id2") }],
            skip: ReactionStepSkipDto::AfterMilliseconds(12),
        }, &repository, &image_repo).await.expect("Expected insert step not to fail");

        insert_movement_step_to_reaction(InsertMovementStepToReactionRequest {
            reaction_id: reaction.id.0.clone(),
            step_index: 2,
            animation: vec![AnimationFrameDto { frame_start: 1, frame_end: 2, image_id: String::from("id1") }],
            skip: ReactionStepSkipDto::AfterMilliseconds(11),
        }, &repository, &image_repo).await.expect("Expected insert step not to fail");

        let third_moving_step = get_moving_animation_step_at(&repository, reaction.id.0.clone(), 2).await;

        assert_eq!(third_moving_step.animation.len(), 1);
        let third_step_frame = third_moving_step.animation.get(0).unwrap();
        assert_eq!(third_step_frame.frame_start, 1);
        assert_eq!(third_step_frame.frame_end, 2);
        assert_eq!(third_step_frame.image_id, String::from("id1"));
    }

    #[tokio::test]
    async fn insert_movement_step_to_an_index_with_existing_step_replace_existing_step() {
        let repository: Arc<dyn ReactionDefinitionRepository> = Arc::new(InMemoryReactionRepository::new());
        let image_repo: Arc<dyn ImageRepository> = Arc::new(InMemoryImageRepository::new());
        let reaction = setup_dummy_chat_command_reaction_definition(&repository).await;
        setup_dummy_images(vec!["id1", "id2"], &image_repo).await;

        insert_movement_step_to_reaction(InsertMovementStepToReactionRequest {
            reaction_id: reaction.id.0.clone(),
            step_index: 0,
            animation: vec![AnimationFrameDto { frame_start: 10, frame_end: 20, image_id: String::from("id1") }],
            skip: ReactionStepSkipDto::ImmediatelyAfter,
        }, &repository, &image_repo).await.expect("Expected insert step not to fail");

        insert_movement_step_to_reaction(InsertMovementStepToReactionRequest {
            reaction_id: reaction.id.0.clone(),
            step_index: 1,
            animation: vec![AnimationFrameDto { frame_start: 10, frame_end: 20, image_id: String::from("id2") }],
            skip: ReactionStepSkipDto::AfterMilliseconds(12),
        }, &repository, &image_repo).await.expect("Expected insert step not to fail");

        insert_movement_step_to_reaction(InsertMovementStepToReactionRequest {
            reaction_id: reaction.id.0.clone(),
            step_index: 1,
            animation: vec![AnimationFrameDto { frame_start: 1, frame_end: 2, image_id: String::from("id1") }],
            skip: ReactionStepSkipDto::AfterMilliseconds(11),
        }, &repository, &image_repo).await.expect("Expected insert step not to fail");

        try_get_animation_step_at(&repository, reaction.id.0.clone(), 2).await.expect_err("should not have added a new step");
        let second_moving_step = get_moving_animation_step_at(&repository, reaction.id.0.clone(), 1).await;

        assert_eq!(second_moving_step.animation.len(), 1);
        let second_step_frame = second_moving_step.animation.get(0).unwrap();
        assert_eq!(second_step_frame.frame_start, 1);
        assert_eq!(second_step_frame.frame_end, 2);
        assert_eq!(second_step_frame.image_id, String::from("id1"));
    }

    async fn get_moving_animation_step_at(repository: &Arc<dyn ReactionDefinitionRepository>, reaction_id: String, index: usize) -> MovingReactionStepDto {
        let first_step = try_get_animation_step_at(repository, reaction_id.clone(), index)
            .await.expect(format!("should have saved a step at index {}", index).as_str());
        if let ReactionStepDto::Moving(moving_step) = first_step {
            moving_step.clone()
        } else {
            unreachable!("should have saved a moving step");
        }
    }

    async fn try_get_animation_step_at(repository: &Arc<dyn ReactionDefinitionRepository>, reaction_id: String, index: usize) -> Result<ReactionStepDto, String> {
        let updated_reaction = get_reaction(GetReactionRequest { id: reaction_id.clone() }, &repository)
            .await.expect(format!("should have a reaction with id {}", reaction_id).as_str());
        let maybe_step: Option<&ReactionStepDto> = updated_reaction.steps.get(index);
        maybe_step.map(|step| step.clone()).ok_or(format!("missing step at index {}", index))
    }
}
