use std::collections::HashMap;
use crate::application::reactions::dtos::reaction_step_dto::AnimationFrameDto;
use crate::domain::emotions::emotion::{Emotion, EmotionLayer};

pub struct EmotionDto {
    pub id: String,
    pub name: String,
    pub animation: Vec<EmotionLayerDto>,
    pub mouth_mapping: HashMap<String, String>
}

pub enum EmotionLayerDto {
    Animation(Vec<AnimationFrameDto>),
    Mouth
}

impl From<Emotion> for EmotionDto {
    fn from(emotion: Emotion) -> Self {
        EmotionDto {
            id: emotion.id.0,
            name: emotion.name.0,
            animation: emotion.animation.into_iter().map(From::from).collect(),
            mouth_mapping: emotion.mouth_mapping.into_iter().map(|(pos, id)| (pos.into(), id.0)).collect()
        }
    }
}

impl From<EmotionLayer> for EmotionLayerDto {
    fn from(layer: EmotionLayer) -> Self {
        match layer {
            EmotionLayer::Mouth => EmotionLayerDto::Mouth,
            EmotionLayer::Animation(animation) => EmotionLayerDto::Animation(animation.frames.into())
        }
    }
}
