use std::clone::Clone;
use std::fmt::Debug;
use thiserror::Error;
use crate::domain::images::image::{ImageId};

#[derive(Clone)]
pub struct Animation {
    pub frames: AnimationFrames
}

#[derive(Debug, Error)]
pub enum CreateAnimationError {
    #[error("Frames not ordered or overlapping")]
    FramesMismatch,
    #[error("Frame ends before starting")]
    MalformedFrame,
    #[error("Frame does not have any duration")]
    EmptyFrame
}

#[derive(Clone)]
pub struct AnimationFrames(pub Vec<AnimationFrame>);

impl AnimationFrames {
    pub(crate) fn all_image_ids(&self) -> Vec<ImageId> {
        self.0.iter().map(|frame| frame.image_id.clone()).collect()
    }
}

impl AnimationFrames {
    pub fn new(frames: Vec<AnimationFrame>) -> Result<AnimationFrames, CreateAnimationError> {
        let mut maybe_current_frame: Option<u16> = None;
        for frame in &frames {
            if let Some(current_frame) = maybe_current_frame {
                if current_frame >= frame.frame_start {
                    return Err(CreateAnimationError::FramesMismatch)
                }
            }
            maybe_current_frame = Some(frame.frame_end);
        }
        Ok(AnimationFrames(frames))
    }
}

#[derive(Clone)]
pub struct AnimationFrame {
    pub frame_start: u16,
    pub frame_end: u16,
    pub image_id: ImageId
}

impl AnimationFrame {
    pub fn new(frame_start: u16, frame_end: u16, image_id: ImageId) -> Result<AnimationFrame, CreateAnimationError> {
        if frame_start == frame_end {
            return Err(CreateAnimationError::EmptyFrame)
        }

        if frame_start > frame_end {
            return Err(CreateAnimationError::MalformedFrame)
        }

        Ok(AnimationFrame {
            frame_start,
            frame_end,
            image_id
        })
    }
}
