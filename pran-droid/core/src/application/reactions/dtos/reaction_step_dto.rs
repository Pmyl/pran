use crate::domain::reactions::reaction::{ReactionStep, ReactionStepSkip};
use std::fmt::Debug;
use std::clone::Clone;
use crate::domain::animations::animation::{AnimationFrame, AnimationFrames};

#[derive(Clone, Debug)]
pub enum ReactionStepDto {
    Moving(MovingReactionStepDto),
}

#[derive(Clone, Debug)]
pub struct MovingReactionStepDto {
    pub animation: Vec<AnimationFrameDto>,
    pub skip: ReactionStepSkipDto
}

#[derive(Clone, Debug)]
pub struct AnimationFrameDto {
    pub frame_start: u16,
    pub frame_end: u16,
    pub image_id: String
}

#[derive(Clone, Debug)]
pub enum ReactionStepSkipDto {
    ImmediatelyAfter,
    AfterMilliseconds(u16),
}

impl From<ReactionStep> for ReactionStepDto {
    fn from(step: ReactionStep) -> Self {
        match step {
            ReactionStep::Moving(moving_step) => ReactionStepDto::Moving(MovingReactionStepDto {
                skip: moving_step.skip.into(),
                animation: moving_step.animation.frames.into()
            })
        }
    }
}

impl From<ReactionStepSkip> for ReactionStepSkipDto {
    fn from(skip: ReactionStepSkip) -> Self {
        match skip {
            ReactionStepSkip::AfterMilliseconds(ms) => ReactionStepSkipDto::AfterMilliseconds(ms.0),
            ReactionStepSkip::ImmediatelyAfter => ReactionStepSkipDto::ImmediatelyAfter
        }
    }
}

impl From<AnimationFrames> for Vec<AnimationFrameDto> {
    fn from(frames: AnimationFrames) -> Self {
        frames.0.into_iter().map(From::from).collect()
    }
}

impl From<AnimationFrame> for AnimationFrameDto {
    fn from(frame: AnimationFrame) -> Self {
        AnimationFrameDto {
            frame_start: frame.frame_start,
            frame_end: frame.frame_end,
            image_id: frame.image_id.0
        }
    }
}