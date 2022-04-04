use std::sync::Arc;
use std::fmt::Debug;
use thiserror::Error;
use crate::application::reactions::dtos::reaction_step_dto::ReactionStepDto;
use crate::domain::animations::animation::{Animation, AnimationFrames, CreateAnimationError};
use crate::domain::reactions::reaction::{ChatTrigger, Milliseconds, MovingReactionStep, Reaction, ReactionId, ReactionStep, ReactionStepSkip, ReactionTrigger};
use crate::domain::reactions::reaction_repository::ReactionRepository;

#[derive(Debug, Error)]
pub enum AddMovementStepToReactionError {
    #[error("Bad request")]
    BadRequest,
    #[error("Wrong animation details")]
    BadAnimationRequest(#[from] CreateAnimationError),
}

pub struct AddMovementStepToReactionRequest {
    reaction_id: String,
    animation: Vec<StepAnimationFrame>
}

pub struct StepAnimationFrame {
    pub image_id: String,
    pub frame_start: u16,
    pub frame_end: u16
}

pub fn add_movement_step_to_reaction(request: AddMovementStepToReactionRequest, repository: &Arc<dyn ReactionRepository>) -> Result<ReactionStepDto, AddMovementStepToReactionError> {
    match repository.get(&ReactionId(request.reaction_id)) {
        Some(mut reaction) => {
            let reaction_step = ReactionStep::Moving(MovingReactionStep {
                skip: ReactionStepSkip::AfterMilliseconds(Milliseconds(0)),
                animation: Animation {
                    frames: AnimationFrames::new(vec![])?
                }
            });
            reaction.add_step(reaction_step.clone());
            repository.update(&reaction).unwrap();

            Ok(reaction_step.into())
        },
        None => Err(AddMovementStepToReactionError::BadRequest)
    }
}

#[cfg(test)]
mod tests {
    use crate::application::reactions::create::{create_reaction, CreateReactionRequest};
    use crate::application::reactions::get::{get_reaction, GetReactionRequest};
    use crate::domain::reactions::reaction::ReactionId;
    use crate::persistence::reactions::in_memory_reaction_repository::InMemoryReactionRepository;
    use super::*;

    #[test]
    fn add_movement_step_to_reaction_wrong_id_return_error() {
        let repository: Arc<dyn ReactionRepository> = Arc::new(InMemoryReactionRepository::new());
        let reaction = create_reaction(CreateReactionRequest {
            trigger: String::from("a trigger")
        }, &repository).unwrap();

        let result = add_movement_step_to_reaction(AddMovementStepToReactionRequest {
            reaction_id: String::from("new id"),
            animation: vec![]
        }, &repository);

        match result {
            Ok(_) => unreachable!("should have returned error"),
            Err(error) => match error {
                AddMovementStepToReactionError::BadRequest => {},
                _ => unreachable!("should have been bad request")
            }
        }
    }

    #[test]
    fn add_movement_step_to_reaction_empty_animation_store_in_repository() {
        let repository: Arc<dyn ReactionRepository> = Arc::new(InMemoryReactionRepository::new());
        let reaction = create_reaction(CreateReactionRequest {
            trigger: String::from("a trigger")
        }, &repository).unwrap();

        let result = add_movement_step_to_reaction(AddMovementStepToReactionRequest {
            reaction_id: reaction.id.clone(),
            animation: vec![]
        }, &repository);

        match result {
            Ok(step) => match get_reaction(GetReactionRequest { id: reaction.id }, &repository) {
                Some(reaction) => assert_eq!(reaction.steps.len(), 1),
                None => unreachable!("should have saved reaction")
            },
            Err(err) => unreachable!("should have not failed with error {:?}", err)
        }
    }

    #[test]
    fn add_movement_step_to_reaction_correctly_map_animation() {
        todo!()
    }
}
