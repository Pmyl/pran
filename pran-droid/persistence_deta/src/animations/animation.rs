use serde::{Serialize, Deserialize};
use pran_droid_core::domain::animations::animation::{Animation, AnimationFrame, AnimationFrames};
use pran_droid_core::domain::images::image::ImageId;

pub type AnimationStorage = Vec<AnimationFrameStorage>;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AnimationFrameStorage {
    frame_start: u16,
    frame_end: u16,
    image_id: String,
}

pub fn into_animation_storage(animation: &Animation) -> AnimationStorage {
    animation.frames.0.iter().map(|frame| AnimationFrameStorage {
        frame_start: frame.frame_start,
        frame_end: frame.frame_end,
        image_id: frame.image_id.0.clone(),
    }).collect()
}

pub fn into_animation_domain(animation: &AnimationStorage) -> Animation {
    Animation { frames: AnimationFrames(
        animation.iter().map(|frame| AnimationFrame {
            frame_start: frame.frame_start,
            frame_end: frame.frame_end,
            image_id: ImageId(frame.image_id.clone()),
        }).collect()
    ) }
}