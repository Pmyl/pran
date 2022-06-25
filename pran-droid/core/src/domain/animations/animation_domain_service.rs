use std::sync::Arc;
use crate::domain::animations::animation::Animation;
use crate::domain::images::image_repository::ImageRepository;

pub(in super::super) struct ValidateAnimationImagesError(pub String);

pub(in super::super) async fn validate_images(animation: &Animation, image_repository: &Arc<dyn ImageRepository>) -> Result<(), ValidateAnimationImagesError> {
    let image_ids = animation.frames.all_image_ids();
    for image_id in image_ids {
        if !image_repository.has(image_id).await {
            return Err(ValidateAnimationImagesError(image_id.0.clone()))
        }
    }

    Ok(())
}