use std::collections::HashMap;
use pran_droid_core::application::emotions::dtos::emotion_dto::{EmotionDto, EmotionLayerDto};
use rocket::serde::Serialize;
use crate::reactions::models::reaction_step_model::AnimationFrameModel;

#[derive(Serialize)]
pub struct EmotionResponse {
    id: String,
    name: String,
    layers: Vec<EmotionLayerResponse>,
}

#[derive(Serialize)]
#[serde(tag = "type")]
pub enum EmotionLayerResponse {
    Animation { frames: Vec<AnimationFrameModel> },
    #[serde(rename_all = "camelCase")]
    Mouth { mouth_mapping: HashMap<String, String> }
}

impl From<EmotionDto> for EmotionResponse {
    fn from(dto: EmotionDto) -> EmotionResponse {
        EmotionResponse {
            id: dto.id,
            name: dto.name,
            layers: dto.animation.into_iter().map(Into::into).collect(),
        }
    }
}

impl From<EmotionLayerDto> for EmotionLayerResponse {
    fn from(dto: EmotionLayerDto) -> EmotionLayerResponse {
        match dto {
            EmotionLayerDto::Animation(animation) =>
                EmotionLayerResponse::Animation { frames: animation.into_iter().map(Into::into).collect() },
            EmotionLayerDto::Mouth { mouth_mapping } => EmotionLayerResponse::Mouth { mouth_mapping }
        }
    }
}