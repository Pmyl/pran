use std::fmt::Debug;
use std::clone::Clone;
use crate::domain::reactions::reaction::{Milliseconds};
use crate::domain::reactions::reaction_definition::{MovingReactionStepDefinition, ReactionStepDefinition, ReactionStepSkipDefinition, ReactionStepMessageAlternativesDefinition, ReactionStepMessageDefinition, TalkingReactionStepDefinition};
use crate::domain::animations::animation::{Animation, AnimationFrame, AnimationFrames, CreateAnimationError};
use crate::domain::images::image::ImageId;

#[derive(Clone, Debug)]
pub enum ReactionStepDto {
    Moving(MovingReactionStepDto),
    Talking(TalkingReactionStepDto)
}

#[derive(Clone, Debug)]
pub struct MovingReactionStepDto {
    pub animation: Vec<AnimationFrameDto>,
    pub skip: ReactionStepSkipDto
}

#[derive(Clone, Debug)]
pub struct TalkingReactionStepDto {
    pub text: Vec<ReactionStepTextAlternativeDto>,
    pub emotion_id: String,
    pub skip: ReactionStepSkipDto
}

#[derive(Clone, Debug)]
pub struct ReactionStepTextAlternativeDto {
    pub probability: f32,
    pub text: ReactionStepTextDto
}

#[derive(Clone, Debug)]
pub enum ReactionStepTextDto {
    Instant(String),
    LetterByLetter(String)
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
    AfterStepWithExtraMilliseconds(u16),
}

impl From<ReactionStepDefinition> for ReactionStepDto {
    fn from(step: ReactionStepDefinition) -> Self {
        match step {
            ReactionStepDefinition::Moving(step) => step.into(),
            ReactionStepDefinition::Talking(step) => step.into(),
            ReactionStepDefinition::CompositeTalking(_) => todo!("This should never happen, reaction step composite is not implemented")
        }
    }
}

impl From<MovingReactionStepDefinition> for ReactionStepDto {
    fn from(moving_step: MovingReactionStepDefinition) -> Self {
        ReactionStepDto::Moving(MovingReactionStepDto {
            skip: moving_step.skip.into(),
            animation: moving_step.animation.frames.into()
        })
    }
}

impl From<ReactionStepSkipDefinition> for ReactionStepSkipDto {
    fn from(skip: ReactionStepSkipDefinition) -> Self {
        match skip {
            ReactionStepSkipDefinition::AfterMilliseconds(ms) => ReactionStepSkipDto::AfterMilliseconds(ms.0),
            ReactionStepSkipDefinition::ImmediatelyAfter => ReactionStepSkipDto::ImmediatelyAfter,
            ReactionStepSkipDefinition::AfterStepWithExtraMilliseconds(ms) => ReactionStepSkipDto::AfterStepWithExtraMilliseconds(ms.0),
        }
    }
}

impl Into<ReactionStepSkipDefinition> for ReactionStepSkipDto {
    fn into(self) -> ReactionStepSkipDefinition {
        match self {
            ReactionStepSkipDto::AfterMilliseconds(ms) => ReactionStepSkipDefinition::AfterMilliseconds(Milliseconds(ms)),
            ReactionStepSkipDto::ImmediatelyAfter => ReactionStepSkipDefinition::ImmediatelyAfter,
            ReactionStepSkipDto::AfterStepWithExtraMilliseconds(ms) => ReactionStepSkipDefinition::AfterStepWithExtraMilliseconds(Milliseconds(ms)),
        }
    }
}

impl From<TalkingReactionStepDefinition> for ReactionStepDto {
    fn from(talking_step: TalkingReactionStepDefinition) -> Self {
        ReactionStepDto::Talking(TalkingReactionStepDto {
            skip: talking_step.skip.into(),
            emotion_id: talking_step.emotion_id.0,
            text: from_text_alternatives_domain(talking_step.alternatives)
        })
    }
}

fn from_text_alternatives_domain(text_definition_alternatives: ReactionStepMessageAlternativesDefinition) -> Vec<ReactionStepTextAlternativeDto> {
    text_definition_alternatives.0.iter().map(|alternative| ReactionStepTextAlternativeDto {
        text: alternative.message.clone().into(),
        probability: alternative.probability
    }).collect()
}

impl From<ReactionStepMessageDefinition> for ReactionStepTextDto {
    fn from(text: ReactionStepMessageDefinition) -> Self {
        match text {
            ReactionStepMessageDefinition::Instant(text) => ReactionStepTextDto::Instant(text),
            ReactionStepMessageDefinition::LetterByLetter(text) => ReactionStepTextDto::LetterByLetter(text),
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

pub(crate) fn frames_dtos_to_animation(frames: Vec<AnimationFrameDto>) -> Result<Animation, CreateAnimationError> {
    Ok(Animation {
        frames: AnimationFrames::new(frames_dtos_to_frames(frames)?)?
    })
}

fn frames_dtos_to_frames(frames: Vec<AnimationFrameDto>) -> Result<Vec<AnimationFrame>, CreateAnimationError> {
    frames.into_iter()
        .map(|frame_dto| AnimationFrame::new(frame_dto.frame_start, frame_dto.frame_end, ImageId(frame_dto.image_id)))
        .collect()
}
