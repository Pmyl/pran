use std::sync::Arc;
use std::fmt::Debug;
use thiserror::Error;
use crate::domain::animations::animation_domain_service::validate_images;
use crate::domain::emotions::emotion_repository::EmotionRepository;
use crate::domain::reactions::reaction_definition::{MovingReactionStepDefinition, ReactionDefinition, ReactionStepDefinition, TalkingReactionStepDefinition};
use crate::domain::images::image_repository::ImageRepository;

pub(crate) fn add_moving_step_to_reaction(reaction: &mut ReactionDefinition, reaction_step: MovingReactionStepDefinition, image_repository: &Arc<dyn ImageRepository>) -> Result<(), AddStepToReactionError> {
    validate_moving_step(&reaction_step, image_repository)?;
    reaction.add_step(ReactionStepDefinition::Moving(reaction_step));
    Ok(())
}

pub(crate) fn replace_moving_step_in_reaction(reaction: &mut ReactionDefinition, reaction_step: MovingReactionStepDefinition, step_index: usize, image_repository: &Arc<dyn ImageRepository>) -> Result<(), AddStepToReactionError> {
    validate_moving_step(&reaction_step, image_repository)?;
    reaction.replace_step_at(ReactionStepDefinition::Moving(reaction_step), step_index);
    Ok(())
}

pub(crate) fn add_talking_step_to_reaction(reaction: &mut ReactionDefinition, reaction_step: TalkingReactionStepDefinition, emotion_repository: &Arc<dyn EmotionRepository>) -> Result<(), AddStepToReactionError> {
    validate_talking_step(&reaction_step, emotion_repository)?;
    reaction.add_step(ReactionStepDefinition::Talking(reaction_step));
    Ok(())
}

pub(crate) fn replace_talking_step_in_reaction(reaction: &mut ReactionDefinition, reaction_step: TalkingReactionStepDefinition, step_index: usize, emotion_repository: &Arc<dyn EmotionRepository>) -> Result<(), AddStepToReactionError> {
    validate_talking_step(&reaction_step, emotion_repository)?;
    reaction.replace_step_at(ReactionStepDefinition::Talking(reaction_step), step_index);
    Ok(())
}

#[derive(Debug, Error)]
pub enum AddStepToReactionError {
    #[error("Entity not found [{0}]")]
    EntityNotFound(String)
}

fn validate_moving_step(moving_reaction_step: &MovingReactionStepDefinition, image_repository: &Arc<dyn ImageRepository>) -> Result<(), AddStepToReactionError> {
    validate_images(&moving_reaction_step.animation, image_repository).map_err(|error| AddStepToReactionError::EntityNotFound(format!("Image: {}", error.0)))
}

fn validate_talking_step(reaction_step: &TalkingReactionStepDefinition, emotion_repository: &Arc<dyn EmotionRepository>) -> Result<(), AddStepToReactionError> {
    if emotion_repository.exists(&reaction_step.emotion_id) {
        Ok(())
    } else {
        Err(AddStepToReactionError::EntityNotFound(String::from(format!("Emotion: {}", reaction_step.emotion_id.0))))
    }
}