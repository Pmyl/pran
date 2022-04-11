use std::sync::Arc;
use std::fmt::Debug;
use thiserror::Error;
use crate::application::reactions::dtos::reaction_step_dto::{AnimationFrameDto, ReactionStepDto, ReactionStepSkipDto};
use crate::domain::animations::animation::{Animation, AnimationFrame, AnimationFrames, CreateAnimationError};
use crate::domain::images::image::ImageId;
use crate::domain::reactions::reaction::{ChatTrigger, Milliseconds, MovingReactionStep, Reaction, ReactionId, ReactionStep, ReactionStepSkip, ReactionTrigger};
use crate::domain::reactions::reaction_domain_service::{add_step_to_reaction, AddStepToReactionError, replace_step_in_reaction};
use crate::domain::reactions::reaction_repository::ReactionRepository;
use crate::ImageRepository;

#[derive(Debug, Error)]
pub enum AddMovementStepToReactionError {
    #[error("Bad request")]
    BadRequest(String),
    #[error("Wrong animation details")]
    BadAnimationRequest(#[from] CreateAnimationError),
    #[error("Wrong image details")]
    BadImageRequest(#[from] AddStepToReactionError),
}

pub struct InsertMovementStepToReactionRequest {
    pub reaction_id: String,
    pub step_index: usize,
    pub animation: Vec<AnimationFrameDto>,
    pub skip: ReactionStepSkipDto
}

pub fn insert_movement_step_to_reaction(request: InsertMovementStepToReactionRequest, repository: &Arc<dyn ReactionRepository>, image_repository: &Arc<dyn ImageRepository>) -> Result<ReactionStepDto, AddMovementStepToReactionError> {
    match repository.get(&ReactionId(request.reaction_id.clone())) {
        Some(mut reaction) => {
            let reaction_step = ReactionStep::Moving(MovingReactionStep {
                skip: match request.skip {
                    ReactionStepSkipDto::ImmediatelyAfter => ReactionStepSkip::ImmediatelyAfter,
                    ReactionStepSkipDto::AfterMilliseconds(ms) => ReactionStepSkip::AfterMilliseconds(Milliseconds(ms))
                },
                animation: Animation {
                    frames: AnimationFrames::new(map_frames(request.animation)?)?
                }
            });
            insert_step_in_correct_index(&mut reaction, &reaction_step, request.step_index, image_repository)?;
            repository.update(&reaction).unwrap();

            Ok(reaction_step.into())
        },
        None => Err(AddMovementStepToReactionError::BadRequest(String::from("The requested reaction id does not exist")))
    }
}

fn insert_step_in_correct_index(reaction: &mut Reaction, reaction_step: &ReactionStep, step_index: usize, image_repository: &Arc<dyn ImageRepository>) -> Result<(), AddMovementStepToReactionError> {
    if step_index > reaction.steps.len() {
        return Err(AddMovementStepToReactionError::BadRequest(String::from("Index out of bounds")));
    } else if step_index == reaction.steps.len() {
        add_step_to_reaction(reaction, reaction_step, image_repository)?;
    } else {
        replace_step_in_reaction(reaction, reaction_step, step_index, image_repository)?;
    }
    
    Ok(())
}

fn map_frames(frames: Vec<AnimationFrameDto>) -> Result<Vec<AnimationFrame>, CreateAnimationError> {
    frames.into_iter()
        .map(|frame_dto| AnimationFrame::new(frame_dto.frame_start, frame_dto.frame_end, ImageId(frame_dto.image_id.clone())))
        .collect()
}

#[cfg(test)]
mod tests {
    use crate::application::reactions::create::{create_reaction, CreateReactionRequest};
    use crate::application::reactions::get::{get_reaction, GetReactionRequest};
    use crate::persistence::reactions::in_memory_reaction_repository::InMemoryReactionRepository;
    use super::*;
    use crate::application::reactions::dtos::reaction_dto::ReactionDto;
    use crate::application::reactions::dtos::reaction_step_dto::{MovingReactionStepDto, ReactionStepSkipDto};
    use crate::{ImageRepository, InMemoryImageRepository};

    #[test]
    fn insert_movement_step_to_reaction_wrong_id_return_error() {
        let repository: Arc<dyn ReactionRepository> = Arc::new(InMemoryReactionRepository::new());
        let image_repo: Arc<dyn ImageRepository> = Arc::new(InMemoryImageRepository::new());
        init_reaction(&repository);

        let result = insert_movement_step_to_reaction(InsertMovementStepToReactionRequest {
            reaction_id: String::from("new id"),
            step_index: 0,
            skip: ReactionStepSkipDto::ImmediatelyAfter,
            animation: vec![]
        }, &repository, &image_repo);

        match result {
            Ok(_) => unreachable!("should have returned error"),
            Err(error) => match error {
                AddMovementStepToReactionError::BadRequest(_) => {},
                _ => unreachable!("should have been bad request")
            }
        }
    }

    #[test]
    fn insert_movement_step_to_reaction_empty_animation_store_in_repository() {
        let repository: Arc<dyn ReactionRepository> = Arc::new(InMemoryReactionRepository::new());
        let image_repo: Arc<dyn ImageRepository> = Arc::new(InMemoryImageRepository::new());
        let reaction = init_reaction(&repository);

        let result = insert_movement_step_to_reaction(InsertMovementStepToReactionRequest {
            reaction_id: reaction.id.clone(),
            step_index: 0,
            skip: ReactionStepSkipDto::ImmediatelyAfter,
            animation: vec![]
        }, &repository, &image_repo);

        match result {
            Ok(step) => match get_reaction(GetReactionRequest { id: reaction.id }, &repository) {
                Some(reaction) => assert_eq!(reaction.steps.len(), 1),
                None => unreachable!("should have saved reaction")
            },
            Err(err) => unreachable!("should have not failed with error {:?}", err)
        }
    }

    #[test]
    fn insert_movement_step_to_reaction_correctly_map_the_animation_of_movement_step() {
        let repository: Arc<dyn ReactionRepository> = Arc::new(InMemoryReactionRepository::new());
        let image_repo: Arc<dyn ImageRepository> = Arc::new(InMemoryImageRepository::new());
        let reaction = init_reaction(&repository);
        init_images(vec!["id1", "id2"], &image_repo);

        let result = insert_movement_step_to_reaction(InsertMovementStepToReactionRequest {
            reaction_id: reaction.id.clone(),
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
        }, &repository, &image_repo);

        result.expect("should have not failed");
        let moving_step = get_moving_animation_step_at(&repository, reaction.id, 0);
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

    #[test]
    fn insert_movement_step_to_reaction_with_non_existing_image_id_errors() {
        let repository: Arc<dyn ReactionRepository> = Arc::new(InMemoryReactionRepository::new());
        let image_repo: Arc<dyn ImageRepository> = Arc::new(InMemoryImageRepository::new());
        let reaction = init_reaction(&repository);

        let result = insert_movement_step_to_reaction(InsertMovementStepToReactionRequest {
            reaction_id: reaction.id.clone(),
            step_index: 0,
            skip: ReactionStepSkipDto::ImmediatelyAfter,
            animation: vec![AnimationFrameDto {
                frame_start: 10,
                frame_end: 20,
                image_id: String::from("not existing image id")
            }]
        }, &repository, &image_repo);

        result.expect_err("should have failed");
    }

    #[test]
    fn insert_movement_step_to_existing_index_with_non_existing_image_id_errors() {
        let repository: Arc<dyn ReactionRepository> = Arc::new(InMemoryReactionRepository::new());
        let image_repo: Arc<dyn ImageRepository> = Arc::new(InMemoryImageRepository::new());
        let reaction = init_reaction(&repository);
        init_images(vec!["id1"], &image_repo);

        let first_insert = insert_movement_step_to_reaction(InsertMovementStepToReactionRequest {
            reaction_id: reaction.id.clone(),
            step_index: 0,
            skip: ReactionStepSkipDto::ImmediatelyAfter,
            animation: vec![AnimationFrameDto {
                frame_start: 10,
                frame_end: 20,
                image_id: String::from("id1")
            }]
        }, &repository, &image_repo);
        let replace_with_not_existing_image = insert_movement_step_to_reaction(InsertMovementStepToReactionRequest {
            reaction_id: reaction.id.clone(),
            step_index: 0,
            skip: ReactionStepSkipDto::ImmediatelyAfter,
            animation: vec![AnimationFrameDto {
                frame_start: 10,
                frame_end: 20,
                image_id: String::from("not existing image id")
            }]
        }, &repository, &image_repo);

        first_insert.expect("should not have failed");
        replace_with_not_existing_image.expect_err("should have failed");
    }

    #[test]
    fn insert_multiple_movement_steps_to_reaction_save_all_of_them_at_provided_index() {
        let repository: Arc<dyn ReactionRepository> = Arc::new(InMemoryReactionRepository::new());
        let image_repo: Arc<dyn ImageRepository> = Arc::new(InMemoryImageRepository::new());
        let reaction = init_reaction(&repository);
        init_images(vec!["id1", "id2"], &image_repo);

        let result_first_step = insert_movement_step_to_reaction(InsertMovementStepToReactionRequest {
            reaction_id: reaction.id.clone(),
            step_index: 0,
            skip: ReactionStepSkipDto::ImmediatelyAfter,
            animation: vec![AnimationFrameDto {
                frame_start: 10,
                frame_end: 20,
                image_id: String::from("id1")
            }]
        }, &repository, &image_repo);

        let result_second_step = insert_movement_step_to_reaction(InsertMovementStepToReactionRequest {
            reaction_id: reaction.id.clone(),
            step_index: 1,
            skip: ReactionStepSkipDto::ImmediatelyAfter,
            animation: vec![AnimationFrameDto {
                frame_start: 13,
                frame_end: 34,
                image_id: String::from("id2")
            }]
        }, &repository, &image_repo);

        result_first_step.expect("add of first step should have not failed");
        result_second_step.expect("add of second step should have not failed");
        let first_moving_step = get_moving_animation_step_at(&repository, reaction.id.clone(), 0);
        let second_moving_step = get_moving_animation_step_at(&repository, reaction.id, 1);

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

    #[test]
    fn insert_movement_step_to_reaction_save_skip_configuration() {
        let repository: Arc<dyn ReactionRepository> = Arc::new(InMemoryReactionRepository::new());
        let image_repo: Arc<dyn ImageRepository> = Arc::new(InMemoryImageRepository::new());
        let reaction = init_reaction(&repository);
        init_images(vec!["id1", "id2"], &image_repo);

        let result_first_step = insert_movement_step_to_reaction(InsertMovementStepToReactionRequest {
            reaction_id: reaction.id.clone(),
            step_index: 0,
            animation: vec![AnimationFrameDto { frame_start: 10, frame_end: 20, image_id: String::from("id1") }],
            skip: ReactionStepSkipDto::ImmediatelyAfter,
        }, &repository, &image_repo);

        let result_second_step = insert_movement_step_to_reaction(InsertMovementStepToReactionRequest {
            reaction_id: reaction.id.clone(),
            step_index: 1,
            animation: vec![AnimationFrameDto { frame_start: 10, frame_end: 20, image_id: String::from("id2") }],
            skip: ReactionStepSkipDto::AfterMilliseconds(12),
        }, &repository, &image_repo);

        result_first_step.expect("add of first step should have not failed");
        result_second_step.expect("add of second step should have not failed");
        let first_moving_step = get_moving_animation_step_at(&repository, reaction.id.clone(), 0);
        let second_moving_step = get_moving_animation_step_at(&repository, reaction.id, 1);

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

    #[test]
    fn insert_movement_step_to_an_index_detached_from_existing_steps_errors() {
        let repository: Arc<dyn ReactionRepository> = Arc::new(InMemoryReactionRepository::new());
        let image_repo: Arc<dyn ImageRepository> = Arc::new(InMemoryImageRepository::new());
        let reaction = init_reaction(&repository);
        init_images(vec!["id1", "id2", "id3"], &image_repo);

        let result_first_step = insert_movement_step_to_reaction(InsertMovementStepToReactionRequest {
            reaction_id: reaction.id.clone(),
            step_index: 0,
            animation: vec![AnimationFrameDto { frame_start: 10, frame_end: 20, image_id: String::from("id1") }],
            skip: ReactionStepSkipDto::ImmediatelyAfter,
        }, &repository, &image_repo);

        let result_second_step = insert_movement_step_to_reaction(InsertMovementStepToReactionRequest {
            reaction_id: reaction.id.clone(),
            step_index: 1,
            animation: vec![AnimationFrameDto { frame_start: 10, frame_end: 20, image_id: String::from("id2") }],
            skip: ReactionStepSkipDto::AfterMilliseconds(12),
        }, &repository, &image_repo);

        let result_detached_step = insert_movement_step_to_reaction(InsertMovementStepToReactionRequest {
            reaction_id: reaction.id.clone(),
            step_index: 3,
            animation: vec![AnimationFrameDto { frame_start: 10, frame_end: 20, image_id: String::from("id3") }],
            skip: ReactionStepSkipDto::AfterMilliseconds(12),
        }, &repository, &image_repo);

        result_first_step.expect("add of first step should have not failed");
        result_second_step.expect("add of second step should have not failed");

        match result_detached_step {
            Err(error) => match error {
                AddMovementStepToReactionError::BadRequest(_) => {
                    try_get_animation_step_at(&repository, reaction.id.clone(), 2).expect_err("should not have added any step");
                    try_get_animation_step_at(&repository, reaction.id, 3).expect_err("should not have added any step");
                },
                _ => unreachable!("should have returned a bad request")
            }
            Ok(_) => unreachable!("should not have added any step")
        }
    }

    #[test]
    fn insert_movement_step_to_an_index_right_after_existing_steps_at_index() {
        let repository: Arc<dyn ReactionRepository> = Arc::new(InMemoryReactionRepository::new());
        let image_repo: Arc<dyn ImageRepository> = Arc::new(InMemoryImageRepository::new());
        let reaction = init_reaction(&repository);
        init_images(vec!["id1", "id2"], &image_repo);

        let result_first_step = insert_movement_step_to_reaction(InsertMovementStepToReactionRequest {
            reaction_id: reaction.id.clone(),
            step_index: 0,
            animation: vec![AnimationFrameDto { frame_start: 10, frame_end: 20, image_id: String::from("id1") }],
            skip: ReactionStepSkipDto::ImmediatelyAfter,
        }, &repository, &image_repo);

        let result_second_step = insert_movement_step_to_reaction(InsertMovementStepToReactionRequest {
            reaction_id: reaction.id.clone(),
            step_index: 1,
            animation: vec![AnimationFrameDto { frame_start: 10, frame_end: 20, image_id: String::from("id2") }],
            skip: ReactionStepSkipDto::AfterMilliseconds(12),
        }, &repository, &image_repo);

        let result_index_step = insert_movement_step_to_reaction(InsertMovementStepToReactionRequest {
            reaction_id: reaction.id.clone(),
            step_index: 2,
            animation: vec![AnimationFrameDto { frame_start: 1, frame_end: 2, image_id: String::from("id1") }],
            skip: ReactionStepSkipDto::AfterMilliseconds(11),
        }, &repository, &image_repo);

        result_first_step.expect("add of first step should have not failed");
        result_second_step.expect("add of second step should have not failed");
        result_index_step.expect("add of step with index 2 should have not failed");

        let third_moving_step = get_moving_animation_step_at(&repository, reaction.id.clone(), 2);

        assert_eq!(third_moving_step.animation.len(), 1);
        let third_step_frame = third_moving_step.animation.get(0).unwrap();
        assert_eq!(third_step_frame.frame_start, 1);
        assert_eq!(third_step_frame.frame_end, 2);
        assert_eq!(third_step_frame.image_id, String::from("id1"));
    }

    #[test]
    fn insert_movement_step_to_an_index_with_existing_step_replace_existing_step() {
        let repository: Arc<dyn ReactionRepository> = Arc::new(InMemoryReactionRepository::new());
        let image_repo: Arc<dyn ImageRepository> = Arc::new(InMemoryImageRepository::new());
        let reaction = init_reaction(&repository);
        init_images(vec!["id1", "id2"], &image_repo);

        let result_first_step = insert_movement_step_to_reaction(InsertMovementStepToReactionRequest {
            reaction_id: reaction.id.clone(),
            step_index: 0,
            animation: vec![AnimationFrameDto { frame_start: 10, frame_end: 20, image_id: String::from("id1") }],
            skip: ReactionStepSkipDto::ImmediatelyAfter,
        }, &repository, &image_repo);

        let result_second_step = insert_movement_step_to_reaction(InsertMovementStepToReactionRequest {
            reaction_id: reaction.id.clone(),
            step_index: 1,
            animation: vec![AnimationFrameDto { frame_start: 10, frame_end: 20, image_id: String::from("id2") }],
            skip: ReactionStepSkipDto::AfterMilliseconds(12),
        }, &repository, &image_repo);

        let result_index_step = insert_movement_step_to_reaction(InsertMovementStepToReactionRequest {
            reaction_id: reaction.id.clone(),
            step_index: 1,
            animation: vec![AnimationFrameDto { frame_start: 1, frame_end: 2, image_id: String::from("id1") }],
            skip: ReactionStepSkipDto::AfterMilliseconds(11),
        }, &repository, &image_repo);

        result_first_step.expect("add of first step should have not failed");
        result_second_step.expect("add of second step should have not failed");
        result_index_step.expect("update of step with index 1 should have not failed");

        try_get_animation_step_at(&repository, reaction.id.clone(), 2).expect_err("should not have added a new step");
        let second_moving_step = get_moving_animation_step_at(&repository, reaction.id.clone(), 1);

        assert_eq!(second_moving_step.animation.len(), 1);
        let second_step_frame = second_moving_step.animation.get(0).unwrap();
        assert_eq!(second_step_frame.frame_start, 1);
        assert_eq!(second_step_frame.frame_end, 2);
        assert_eq!(second_step_frame.image_id, String::from("id1"));
    }

    fn init_reaction(repository: &Arc<dyn ReactionRepository>) -> ReactionDto {
        create_reaction(CreateReactionRequest {
            trigger: String::from("a trigger")
        }, &repository).unwrap()
    }

    fn init_images(ids: Vec<&str>, repository: &Arc<dyn ImageRepository>) {
        for id in ids {
            repository.insert(&InMemoryImageRepository::create_dummy_image(id.to_string())).unwrap();
        }
    }

    fn get_moving_animation_step_at(repository: &Arc<dyn ReactionRepository>, reaction_id: String, index: usize) -> MovingReactionStepDto {
        let first_step = try_get_animation_step_at(repository, reaction_id.clone(), index)
            .expect(format!("should have saved a step at index {}", index).as_str());
        if let ReactionStepDto::Moving(moving_step) = first_step {
            moving_step.clone()
        } else {
            unreachable!("should have saved a moving step");
        }
    }

    fn try_get_animation_step_at(repository: &Arc<dyn ReactionRepository>, reaction_id: String, index: usize) -> Result<ReactionStepDto, String> {
        let updated_reaction = get_reaction(GetReactionRequest { id: reaction_id.clone() }, &repository)
            .expect(format!("should have a reaction with id {}", reaction_id).as_str());
        let maybe_step: Option<&ReactionStepDto> = updated_reaction.steps.get(index);
        maybe_step.map(|step| step.clone()).ok_or(format!("missing step at index {}", index))
    }
}
