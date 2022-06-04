use std::sync::Arc;
use std::fmt::Debug;
use thiserror::Error;
use crate::domain::animations::animation_domain_service::validate_images;
use crate::domain::reactions::reaction::{MovingReactionStep, Reaction, ReactionStep};
use crate::domain::images::image_repository::ImageRepository;

pub(crate) fn add_step_to_reaction(reaction: &mut Reaction, reaction_step: &ReactionStep, image_repository: &Arc<dyn ImageRepository>) -> Result<(), AddStepToReactionError> {
    validate_step(reaction_step, image_repository)?;
    reaction.add_step(reaction_step.clone());
    Ok(())
}

pub(crate) fn replace_step_in_reaction(reaction: &mut Reaction, reaction_step: &ReactionStep, step_index: usize, image_repository: &Arc<dyn ImageRepository>) -> Result<(), AddStepToReactionError> {
    validate_step(reaction_step, image_repository)?;
    reaction.replace_step_at(reaction_step.clone(), step_index);
    Ok(())
}

#[derive(Debug, Error)]
pub enum AddStepToReactionError {
    #[error("Image not found {0}")]
    ImageNotFound(String)
}

fn validate_step(reaction_step: &ReactionStep, image_repository: &Arc<dyn ImageRepository>) -> Result<(), AddStepToReactionError> {
    match reaction_step {
        ReactionStep::Moving(moving_reaction_step) => ensure_all_images_exist(moving_reaction_step, image_repository)?
    }
    Ok(())
}

fn ensure_all_images_exist(step: &MovingReactionStep, image_repository: &Arc<dyn ImageRepository>) -> Result<(), AddStepToReactionError> {
    validate_images(&step.animation, image_repository).map_err(|error| AddStepToReactionError::ImageNotFound(error.0))
}