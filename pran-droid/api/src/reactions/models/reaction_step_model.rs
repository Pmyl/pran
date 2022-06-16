use rocket::serde::{Deserialize, Serialize};
use pran_droid_core::application::reactions::dtos::reaction_step_dto::{AnimationFrameDto, ReactionStepDto, ReactionStepSkipDto, ReactionStepTextDto};

#[derive(Serialize)]
#[serde(tag = "type")]
pub enum ReactionStepModel {
    Moving { animation: Vec<AnimationFrameModel>, skip: Option<ReactionStepSkipModel> },
    Talking { text: String, emotion_id: String, skip: Option<ReactionStepSkipModel> },
}

impl From<ReactionStepDto> for ReactionStepModel {
    fn from(dto: ReactionStepDto) -> ReactionStepModel {
        match dto {
            ReactionStepDto::Moving(movement_step) => {
                ReactionStepModel::Moving {
                    animation: movement_step.animation.into_iter().map(From::from).collect(),
                    skip: from_dto_to_model(movement_step.skip)
                }
            }
            ReactionStepDto::Talking(talking_step) => {
                ReactionStepModel::Talking {
                    text: match talking_step.text {
                        ReactionStepTextDto::Instant(text) => text,
                        ReactionStepTextDto::LetterByLetter(text) => text,
                    },
                    emotion_id: talking_step.emotion_id,
                    skip: from_dto_to_model(talking_step.skip)
                }
            }
        }
    }
}

#[derive(Deserialize, Serialize)]
#[serde(tag = "type")]
pub enum ReactionStepSkipModel {
    #[serde(rename = "AfterTime", rename_all = "camelCase")]
    AfterMilliseconds { ms: u16 },
    #[serde(rename = "AfterStep", rename_all = "camelCase")]
    AfterStep { extra_ms: u16 }
}

pub(crate) fn from_dto_to_model(dto: ReactionStepSkipDto) -> Option<ReactionStepSkipModel> {
    match dto {
        ReactionStepSkipDto::ImmediatelyAfter => None,
        ReactionStepSkipDto::AfterMilliseconds(ms) => Some(ReactionStepSkipModel::AfterMilliseconds { ms }),
        ReactionStepSkipDto::AfterStepWithExtraMilliseconds(ms) => Some(ReactionStepSkipModel::AfterStep { extra_ms: ms }),
    }
}

pub(crate) fn from_model_to_dto(model: Option<ReactionStepSkipModel>) -> ReactionStepSkipDto {
    match model {
        None => ReactionStepSkipDto::ImmediatelyAfter,
        Some(ReactionStepSkipModel::AfterMilliseconds { ms }) => ReactionStepSkipDto::AfterMilliseconds(ms),
        Some(ReactionStepSkipModel::AfterStep { extra_ms }) => ReactionStepSkipDto::AfterStepWithExtraMilliseconds(extra_ms),
    }
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AnimationFrameModel {
    pub frame_start: u16,
    pub frame_end: u16,
    pub image_id: String
}

impl From<AnimationFrameDto> for AnimationFrameModel {
    fn from(dto: AnimationFrameDto) -> AnimationFrameModel {
        AnimationFrameModel {
            frame_start: dto.frame_start,
            frame_end: dto.frame_end,
            image_id: dto.image_id
        }
    }
}

impl Into<AnimationFrameDto> for AnimationFrameModel {
    fn into(self: AnimationFrameModel) -> AnimationFrameDto {
        AnimationFrameDto {
            frame_start: self.frame_start,
            frame_end: self.frame_end,
            image_id: self.image_id
        }
    }
}