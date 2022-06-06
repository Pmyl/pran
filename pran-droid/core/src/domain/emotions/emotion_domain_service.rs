use thiserror::Error;
use std::sync::Arc;
use crate::domain::animations::animation::Animation;
use crate::domain::animations::animation_domain_service::validate_images;
use crate::domain::emotions::emotion::{Emotion, MouthPositionName};
use crate::domain::images::image::ImageId;
use crate::domain::images::image_repository::ImageRepository;

#[derive(Debug, Error)]
pub enum SetMouthPositionToEmotionError {
    #[error("Image not found {0}")]
    ImageNotFound(String)
}

#[derive(Debug, Error)]
#[error("{0}")]
pub struct UpdateLayerInEmotionError(pub String);

pub(crate) fn set_mouth_position(emotion: &mut Emotion, position_name: MouthPositionName, image_id: ImageId, image_repository: &Arc<dyn ImageRepository>) -> Result<(), SetMouthPositionToEmotionError> {
    if image_repository.has(&image_id) {
        emotion.set_mouth_position(position_name, image_id);
        Ok(())
    } else {
        Err(SetMouthPositionToEmotionError::ImageNotFound(image_id.0))
    }
}

pub(crate) fn update_layer_in_emotion(index: usize, emotion: &mut Emotion, animation: Animation, image_repository: &Arc<dyn ImageRepository>) -> Result<(), UpdateLayerInEmotionError> {
    validate_images(&animation, image_repository).map_err(|error| UpdateLayerInEmotionError(error.0.clone()))?;
    emotion.update_layer(index, animation).map_err(|_| UpdateLayerInEmotionError(String::from("Updating layer at wrong index")))?;

    Ok(())
}