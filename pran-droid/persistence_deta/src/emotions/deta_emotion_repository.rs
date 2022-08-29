use std::collections::HashMap;
use async_trait::async_trait;
use serde::{Serialize, Deserialize};
use serde_json::{Map, Value};
use uuid::Uuid;
use pran_droid_core::domain::emotions::emotion::{AnyLayerId, EmotionId, EmotionLayer, EmotionLayerId, EmotionName, LayerTranslation, LayerTranslations, MouthLayerId, MouthPositionName};
use pran_droid_core::domain::images::image::ImageId;
use pran_droid_core::domain::emotions::emotion::{Emotion};
use crate::deta::{Base, Deta, Query, InsertError as DetaInsertError, PutError, QueryAll};
use pran_droid_core::domain::emotions::emotion_repository::{EmotionRepository, EmotionInsertError, EmotionUpdateError};
use crate::animations::animation::{AnimationStorage, into_animation_domain, into_animation_storage};

const MOUTH_LAYER_ID: &str = "MOUTH-B0-00AC-4540-BD5E-F2BD30438414";

pub struct DetaEmotionRepository {
    base: Base,
}

impl DetaEmotionRepository {
    pub fn new(project_key: String, project_id: String) -> Self {
        Self { base: Deta::new(project_key, project_id).base("pran_droid_emotions") }
    }

    async fn fetch_one_by_name(&self, name: &EmotionName) -> Option<EmotionStorage> {
        let mut query = Map::new();
        query.insert("name".to_string(), Value::String(name.0.clone()));

        self.base.query::<EmotionStorage>(Query { query: Some(vec![query]), ..Query::default() }).await
            .expect("Unexpected error")
            .items
            .first()
            .cloned()
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
struct EmotionStorage {
    key: String,
    name: String,
    layers: Vec<EmotionLayerStorage>
}

#[derive(Clone, Debug, Serialize, Deserialize)]
enum EmotionLayerStorage {
    Animation { id: String, parent_id: Option<String>, frames: AnimationStorage, translations: Option<HashMap<u32, (u32, u32)>> },
    Mouth { parent_id: Option<String>, mouth_mapping: HashMap<String, String>, translations: Option<HashMap<u32, (u32, u32)>> }
}

impl Into<Emotion> for EmotionStorage {
    fn into(self) -> Emotion {
        Emotion {
            id: EmotionId(self.key),
            name: EmotionName(self.name),
            animation: self.layers.iter().map(into_layer_domain).collect(),
        }
    }
}

impl From<&Emotion> for EmotionStorage {
    fn from(emotion: &Emotion) -> Self {
        Self {
            key: emotion.id.0.clone(),
            name: emotion.name.0.clone(),
            layers: emotion.animation.iter().map(into_layer_storage).collect()
        }
    }
}

fn into_layer_domain(layer: &EmotionLayerStorage) -> EmotionLayer {
    match layer {
        EmotionLayerStorage::Animation { id, parent_id, frames, translations } => EmotionLayer::Animation {
            id: AnyLayerId(id.clone()),
            animation: into_animation_domain(frames),
            parent_id: parent_id.as_ref().map(into_emotion_layer_id_domain),
            translations: into_translations_domain(translations)
        },
        EmotionLayerStorage::Mouth { parent_id, mouth_mapping, translations } => EmotionLayer::Mouth {
            id: MouthLayerId,
            parent_id: parent_id.as_ref().map(into_any_layer_id_domain),
            mouth_mapping: mouth_mapping.into_iter().map(|(pos, id)| (TryInto::<MouthPositionName>::try_into(pos).unwrap(), ImageId(id.clone()))).collect(),
            translations: into_translations_domain(translations)
        },
    }
}

fn into_emotion_layer_id_domain(id_string: &String) -> EmotionLayerId {
    match id_string.as_str() {
        MOUTH_LAYER_ID => EmotionLayerId::Mouth(MouthLayerId),
        _ => EmotionLayerId::Custom(AnyLayerId(id_string.clone()))
    }
}

fn into_any_layer_id_domain(id_string: &String) -> AnyLayerId {
    AnyLayerId(id_string.clone())
}

fn into_layer_storage(layer: &EmotionLayer) -> EmotionLayerStorage {
    match layer {
        EmotionLayer::Animation { id, parent_id, animation, translations } => EmotionLayerStorage::Animation {
            id: id.0.clone(),
            parent_id: parent_id.as_ref().map(into_emotion_layer_id_storage),
            frames: into_animation_storage(animation),
            translations: Some(into_translations_storage(translations))
        },
        EmotionLayer::Mouth { parent_id, mouth_mapping, translations, .. } => EmotionLayerStorage::Mouth {
            mouth_mapping: mouth_mapping.into_iter().map(|(pos, id)| (pos.into(), id.0.clone())).collect(),
            parent_id: parent_id.as_ref().map(into_any_layer_id_storage),
            translations: Some(into_translations_storage(translations))
        },
    }
}

fn into_emotion_layer_id_storage(id: &EmotionLayerId) -> String {
    match id {
        EmotionLayerId::Mouth(_) => MOUTH_LAYER_ID.to_string(),
        EmotionLayerId::Custom(AnyLayerId(id)) => id.clone()
    }
}

fn into_any_layer_id_storage(id: &AnyLayerId) -> String {
    id.0.clone()
}

fn into_translations_domain(translations: &Option<HashMap<u32, (u32, u32)>>) -> HashMap<u32, LayerTranslation> {
    match translations {
        None => HashMap::new(),
        Some(translations) => translations.iter().fold(HashMap::new(), |mut acc, (frame, translation)| {
            acc.insert(*frame, LayerTranslation { x: translation.0, y: translation.1 });
            acc
        })
    }
}

fn into_translations_storage(translations: &LayerTranslations) -> HashMap<u32, (u32, u32)> {
    translations.iter().fold(HashMap::new(), |mut acc, (frame, translation)| {
        acc.insert(*frame, (translation.x, translation.y));
        acc
    })
}

#[async_trait]
impl EmotionRepository for DetaEmotionRepository {
    fn next_id(&self) -> EmotionId {
        EmotionId(Uuid::new_v4().to_string())
    }

    async fn insert(&self, emotion: &Emotion) -> Result<(), EmotionInsertError> {
        self.base.insert::<EmotionStorage>(emotion.into()).await
            .map_err(|error| match error {
                DetaInsertError::Unexpected(error) => EmotionInsertError::Unexpected(error),
                DetaInsertError::Conflict => EmotionInsertError::Conflict,
                DetaInsertError::BadRequest(error) => EmotionInsertError::Unexpected(error)
            })
            .map(|_| ())
    }

    async fn update(&self, emotion: &Emotion) -> Result<(), EmotionUpdateError> {
        self.base.put::<EmotionStorage>(vec![emotion.into()]).await
            .map_err(|error| match error {
                PutError::Unexpected(_) => EmotionUpdateError::Missing,
                PutError::BadRequest(_) => EmotionUpdateError::Missing
            })
            .map(|_| ())
    }

    async fn get(&self, id: &EmotionId) -> Option<Emotion> {
        self.base.get::<EmotionStorage>(id.0.as_str()).await.ok().map(Into::into)
    }

    async fn get_all(&self) -> Vec<Emotion> {
        self.base.query_all::<EmotionStorage>(QueryAll::default()).await
            .expect("Unexpected error")
            .into_iter()
            .map(Into::into)
            .collect()
    }

    async fn exists(&self, id: &EmotionId) -> bool {
        self.base.get::<EmotionStorage>(id.0.as_str()).await.ok().is_some()
    }

    async fn get_by_name(&self, name: &EmotionName) -> Option<Emotion> {
        self.fetch_one_by_name(name).await.map(Into::into)
    }

    async fn exists_with_name(&self, name: &EmotionName) -> bool {
        self.fetch_one_by_name(name).await.is_some()
    }
}