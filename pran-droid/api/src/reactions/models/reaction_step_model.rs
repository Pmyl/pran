use rocket::serde::{Deserialize, Serialize};
use pran_droid_core::application::reactions::dtos::reaction_step_dto::{AnimationFrameDto, ReactionStepDto, ReactionStepSkipDto};

#[derive(Deserialize, Serialize)]
#[serde(untagged)]
pub enum ReactionStepModel {
    Movement { animation: Vec<AnimationFrameModel>, skip: ReactionStepSkipModel }
}

impl From<ReactionStepDto> for ReactionStepModel {
    fn from(dto: ReactionStepDto) -> ReactionStepModel {
        match dto {
            ReactionStepDto::Moving(movement_step) => {
                ReactionStepModel::Movement {
                    animation: movement_step.animation.into_iter().map(From::from).collect(),
                    skip: movement_step.skip.into()
                }
            }
        }
    }
}

#[derive(Deserialize, Serialize)]
#[serde(untagged)]
pub enum ReactionStepSkipModel {
    None,
    #[serde(rename_all = "camelCase")]
    AfterMilliseconds { after_ms: u16 }
}

impl From<ReactionStepSkipDto> for ReactionStepSkipModel {
    fn from(dto: ReactionStepSkipDto) -> ReactionStepSkipModel {
        match dto {
            ReactionStepSkipDto::ImmediatelyAfter => ReactionStepSkipModel::None,
            ReactionStepSkipDto::AfterMilliseconds(ms) => ReactionStepSkipModel::AfterMilliseconds { after_ms: ms }
        }
    }
}

impl Into<ReactionStepSkipDto> for ReactionStepSkipModel {
    fn into(self: ReactionStepSkipModel) -> ReactionStepSkipDto {
        match self {
            ReactionStepSkipModel::None => ReactionStepSkipDto::ImmediatelyAfter,
            ReactionStepSkipModel::AfterMilliseconds { after_ms } => ReactionStepSkipDto::AfterMilliseconds(after_ms)
        }
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