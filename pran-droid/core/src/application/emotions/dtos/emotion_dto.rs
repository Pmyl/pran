use std::collections::HashMap;
use crate::application::reactions::dtos::reaction_step_dto::AnimationFrameDto;
use crate::domain::emotions::emotion::{AnyLayerId, Emotion, EmotionLayer, EmotionLayerId, LayerTranslation, LayerTranslations, MouthLayerId};

pub const MOUTH_LAYER_ID: &str = "Mouth";

pub struct EmotionDto {
    pub id: String,
    pub name: String,
    pub animation: Vec<EmotionLayerDto>,
}

pub enum EmotionLayerDto {
    Animation { id: String, parent_id: Option<String>, animation: Vec<AnimationFrameDto>, translations: HashMap<u32, (u32, u32)> },
    Mouth { id: String, parent_id: Option<String>, mouth_mapping: HashMap<String, String>, translations: HashMap<u32, (u32, u32)> }
}

impl EmotionDto {
    pub fn assert_id_is_not_mouth_reserved_string(id_string: &String) -> Result<(), ()> {
        if id_string.as_str() == MOUTH_LAYER_ID {
            Err(())
        } else {
            Ok(())
        }
    }
}

impl From<Emotion> for EmotionDto {
    fn from(emotion: Emotion) -> Self {
        EmotionDto {
            id: emotion.id.0,
            name: emotion.name.0,
            animation: emotion.animation.into_iter().map(From::from).collect(),
        }
    }
}

impl From<EmotionLayer> for EmotionLayerDto {
    fn from(layer: EmotionLayer) -> Self {
        match layer {
            EmotionLayer::Mouth { parent_id, mouth_mapping, translations, .. } => EmotionLayerDto::Mouth {
                id: String::from(MOUTH_LAYER_ID),
                parent_id: parent_id.map(|any_id| any_id.0),
                mouth_mapping: mouth_mapping.into_iter().map(|(pos, id)| (pos.into(), id.0)).collect(),
                translations: translations.iter().fold(HashMap::new(), |mut acc, (frame, translation)| {
                    acc.insert(*frame, (translation.x, translation.y));
                    acc
                })
            },
            EmotionLayer::Animation { id, animation, parent_id, translations } => EmotionLayerDto::Animation {
                id: id.0,
                animation: animation.frames.into(),
                parent_id: parent_id.map(|id| match id {
                    EmotionLayerId::Mouth(_) => String::from(MOUTH_LAYER_ID),
                    EmotionLayerId::Custom(layer_id) => layer_id.0
                }),
                translations: translations.iter().fold(HashMap::new(), |mut acc, (frame, translation)| {
                    acc.insert(*frame, (translation.x, translation.y));
                    acc
                })
            }
        }
    }
}

impl From<String> for EmotionLayerId {
    fn from(id_string: String) -> Self {
        match id_string.as_str() {
            MOUTH_LAYER_ID => EmotionLayerId::Mouth(MouthLayerId),
            _ => EmotionLayerId::Custom(AnyLayerId(id_string.clone()))
        }
    }
}

pub fn into_translations(translations: Option<HashMap<u32, (u32, u32)>>) -> LayerTranslations {
    match translations {
        None => HashMap::new(),
        Some(translations) => translations.iter().fold(HashMap::new(), |mut acc, (frame, translation)| {
            acc.insert(*frame, LayerTranslation { x: translation.0, y: translation.1 });
            acc
        })
    }
}
