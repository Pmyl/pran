use std::clone::Clone;
use std::cmp::PartialEq;
use std::fmt::Debug;
use rocket::shield::Frame;
use thiserror::Error;
use crate::domain::images::image::{Image, ImageId};

#[derive(Clone)]
pub struct Animation {
    pub frames: AnimationFrames
}

#[derive(Clone, PartialEq)]
pub struct AnimationId(pub String);

#[derive(Debug, Error)]
pub enum CreateAnimationError {
    #[error("Frames not ordered or overlapping")]
    FramesMismatch,
    #[error("Frame ends before starting")]
    DistortedFrame,
    #[error("Frame does not have any duration")]
    EmptyFrame
}

#[derive(Clone)]
pub struct AnimationFrames(pub Vec<AnimationFrame>);

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
    frame_start: u16,
    frame_end: u16,
    image_id: ImageId
}

impl AnimationFrame {
    pub fn new(frame_start: u16, frame_end: u16, image_id: ImageId) -> Result<AnimationFrame, CreateAnimationError> {
        if frame_start == frame_end {
            return Err(CreateAnimationError::EmptyFrame)
        }

        if frame_start > frame_end {
            return Err(CreateAnimationError::DistortedFrame)
        }

        Ok(AnimationFrame {
            frame_start,
            frame_end,
            image_id
        })
    }
}

impl TryFrom<String> for AnimationId {
    type Error = ();

    fn try_from(value: String) -> Result<Self, Self::Error> {
        if value.is_empty() {
            return Err(());
        }
        Ok(Self(value))
    }
}