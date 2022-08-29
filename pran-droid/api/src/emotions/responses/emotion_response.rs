﻿use std::collections::HashMap;
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
    #[serde(rename_all = "camelCase")]
    Animation { id: String, parent_id: Option<String>, frames: Vec<AnimationFrameModel>, translations: HashMap<u32, (u32, u32)> },
    #[serde(rename_all = "camelCase")]
    Mouth { id: String, parent_id: Option<String>, mouth_mapping: HashMap<String, String>, translations: HashMap<u32, (u32, u32)> }
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
            EmotionLayerDto::Animation { id, parent_id, animation, translations } =>
                EmotionLayerResponse::Animation { id, parent_id, frames: animation.into_iter().map(Into::into).collect(), translations },
            EmotionLayerDto::Mouth { id, parent_id, mouth_mapping, translations, .. } =>
                EmotionLayerResponse::Mouth { id, parent_id, mouth_mapping, translations }
        }
    }
}
