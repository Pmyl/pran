use itertools::Itertools;
use std::collections::HashMap;
use std::sync::Arc;
use async_trait::async_trait;
use sea_orm::{QueryFilter};
use sea_orm::{entity::*};
use sea_orm::DatabaseConnection;
use uuid::Uuid;
use pran_droid_core::domain::animations::animation::{Animation, AnimationFrame, AnimationFrames};
use pran_droid_core::domain::emotions::emotion::{Emotion, EmotionId, EmotionLayer, EmotionName, MouthPositionName};
use pran_droid_core::domain::emotions::emotion_repository::{EmotionRepository, EmotionUpdateError, EmotionInsertError};
use pran_droid_core::domain::images::image::ImageId;
use pran_droid_persistence_entities::emotions::emotion::Entity as EmotionEntity;
use pran_droid_persistence_entities::emotions::emotion::Model as EmotionModel;
use pran_droid_persistence_entities::emotions::emotion::ActiveModel as EmotionActiveModel;
use pran_droid_persistence_entities::emotions::emotion::Column as EmotionColumn;
use pran_droid_persistence_entities::emotions::emotion_animation_layer::Entity as EmotionAnimationLayerEntity;
use pran_droid_persistence_entities::emotions::emotion_animation_layer::Model as EmotionAnimationLayerModel;
use pran_droid_persistence_entities::emotions::emotion_animation_layer::ActiveModel as EmotionAnimationLayerActiveModel;
use pran_droid_persistence_entities::emotions::emotion_mouth_layer::Entity as EmotionMouthLayerEntity;
use pran_droid_persistence_entities::emotions::emotion_mouth_layer::Model as EmotionMouthLayerModel;
use pran_droid_persistence_entities::emotions::emotion_mouth_layer::ActiveModel as EmotionMouthLayerActiveModel;
use crate::connectors::connector::SeaOrmDatabaseConnector;

fn into_emotion_table(emotion: &Emotion) -> EmotionActiveModel {
    EmotionActiveModel { id: Set(emotion.id.0.clone()), name: Set(emotion.name.0.clone()) }
}

fn into_emotion_domain(model: EmotionModel, animation_layer_models: Vec<EmotionAnimationLayerModel>, mouth_layer: EmotionMouthLayerModel) -> Emotion {
    let mut layers: Vec<EmotionLayer> = vec![];

    let index = usize::try_from(mouth_layer.layer_index).unwrap();

    layers.insert(index, EmotionLayer::Mouth {
        mouth_mapping: serde_json::from_str::<HashMap<String, String>>(mouth_layer.mapping.as_str()).unwrap().into_iter()
            .map(|(a, b)| (MouthPositionName::try_from(a.clone()).unwrap(), ImageId(b.clone())))
            .collect()
    });

    let grouped_models = animation_layer_models.into_iter()
        .sorted_by_key(|layer| layer.layer_index)
        .group_by(|layer| layer.layer_index);

    for (index, group) in &grouped_models {
        layers.insert(usize::try_from(index).unwrap(), EmotionLayer::Animation(Animation {
            frames: AnimationFrames(group.map(|model| AnimationFrame {
                frame_start: model.frame_start,
                frame_end: model.frame_end,
                image_id: ImageId(model.image_id),
            }).collect())
        }))
    }

    Emotion {
        id: EmotionId(model.id),
        name: EmotionName(model.name),
        animation: layers
    }
}

fn into_emotion_mouth_table(emotion: &Emotion) -> EmotionMouthLayerActiveModel {
    EmotionMouthLayerActiveModel {
        id: NotSet,
        emotion_id: Set(emotion.id.0.clone()),
        layer_index: Set(u32::try_from(emotion.animation.iter().position(|layer| matches!(layer, EmotionLayer::Mouth { .. })).unwrap()).unwrap()),
        mapping: Set({
            let layer = emotion.animation.iter().find(|layer| matches!(layer, EmotionLayer::Mouth { .. }));
            let mapping = if let Some(EmotionLayer::Mouth { mouth_mapping }) = layer {
                Some(mouth_mapping)
            } else {
                None
            }.unwrap();

            serde_json::to_string(&mapping.into_iter().map(|(a, b)| (a.into(), b.0.clone())).collect::<HashMap<String, String>>()).unwrap()
        }),
    }
}

fn into_emotion_animation_table(emotion: &Emotion) -> Vec<EmotionAnimationLayerActiveModel> {
    let mut animation_layer_models: Vec<EmotionAnimationLayerActiveModel> = vec![];

    for (pos, layer) in emotion.animation.iter().enumerate() {
        if let EmotionLayer::Animation(ref animation) = layer {
            for frame in &animation.frames.0 {
                animation_layer_models.push(
                    EmotionAnimationLayerActiveModel {
                        id: NotSet,
                        emotion_id: Set(emotion.id.0.clone()),
                        layer_index: Set(u32::try_from(pos).unwrap()),
                        frame_start: Set(frame.frame_start),
                        frame_end: Set(frame.frame_end),
                        image_id: Set(frame.image_id.0.clone()),
                    }
                );
            }
        }
    }

    animation_layer_models
}

pub struct SeaOrmEmotionRepository {
    pub connector: Arc<dyn SeaOrmDatabaseConnector>,
}

#[async_trait]
impl EmotionRepository for SeaOrmEmotionRepository {
    fn next_id(&self) -> EmotionId {
        EmotionId(Uuid::new_v4().to_string())
    }

    async fn insert(&self, emotion: &Emotion) -> Result<(), EmotionInsertError> {
        let connection: DatabaseConnection = self.connector.connect().await;

        EmotionEntity::insert(into_emotion_table(emotion)).exec(&connection).await
            .map_err(|error| if error.to_string().to_lowercase().contains("unique") { EmotionInsertError::Conflict } else { EmotionInsertError::Unexpected(error.to_string()) })?;

        EmotionMouthLayerEntity::insert(into_emotion_mouth_table(emotion)).exec(&connection).await
            .map_err(|error| EmotionInsertError::Unexpected(error.to_string()))?;

        let animation_layers_to_insert = into_emotion_animation_table(emotion);

        if animation_layers_to_insert.len() > 0 {
            EmotionAnimationLayerEntity::insert_many(animation_layers_to_insert).exec(&connection).await
                .map_err(|error| EmotionInsertError::Unexpected(error.to_string()))?;
        }

        Ok(())
    }

    async fn update(&self, emotion: &Emotion) -> Result<(), EmotionUpdateError> {
        if !self.exists(&emotion.id).await {
            return Err(EmotionUpdateError::Missing);
        }

        let connection = self.connector.connect().await;

        EmotionEntity::delete_by_id(emotion.id.0.clone()).exec(&connection).await.unwrap();
        self.insert(emotion).await.unwrap();

        Ok(())
    }

    async fn get(&self, id: &EmotionId) -> Option<Emotion> {
        let connection = self.connector.connect().await;

        let emotion: EmotionModel = EmotionEntity::find_by_id(id.0.clone())
            .one(&connection)
            .await.unwrap()?;

        let (animation_layers, mouth_layer) = Self::get_layers(&connection, &emotion).await;

        Some(into_emotion_domain(emotion, animation_layers, mouth_layer))
    }

    async fn get_all(&self) -> Vec<Emotion> {
        let connection = self.connector.connect().await;

        let emotions_with_animations: Vec<(EmotionModel, Vec<EmotionAnimationLayerModel>)> = EmotionEntity::find()
            .find_with_related(EmotionAnimationLayerEntity)
            .all(&connection)
            .await.unwrap();

        let mut emotions: Vec<Emotion> = vec![];

        for emotion_with_animations in emotions_with_animations {
            let mouth_layer: EmotionMouthLayerModel = emotion_with_animations.0
                .find_related(EmotionMouthLayerEntity)
                .one(&connection)
                .await.unwrap().unwrap();

            emotions.push(into_emotion_domain(emotion_with_animations.0, emotion_with_animations.1, mouth_layer))
        }

        emotions
    }

    async fn exists(&self, id: &EmotionId) -> bool {
        EmotionEntity::find_by_id(id.0.clone()).one(&self.connector.connect().await).await.unwrap().is_some()
    }

    async fn get_by_name(&self, name: &EmotionName) -> Option<Emotion> {
        let connection = self.connector.connect().await;

        let emotion: EmotionModel = EmotionEntity::find()
            .filter(EmotionColumn::Name.eq(name.0.clone()))
            .one(&connection)
            .await.unwrap()?;

        let (animation_layers, mouth_layer) = Self::get_layers(&connection, &emotion).await;

        Some(into_emotion_domain(emotion, animation_layers, mouth_layer))
    }

    async fn exists_with_name(&self, name: &EmotionName) -> bool {
        EmotionEntity::find()
            .filter(EmotionColumn::Name.eq(name.0.clone()))
            .one(&self.connector.connect().await)
            .await.unwrap()
            .is_some()
    }
}

impl SeaOrmEmotionRepository {
    async fn get_layers(connection: &DatabaseConnection, emotion: &EmotionModel) -> (Vec<EmotionAnimationLayerModel>, EmotionMouthLayerModel) {
        (emotion
            .find_related(EmotionAnimationLayerEntity)
            .all(connection)
            .await.unwrap(),

        emotion
            .find_related(EmotionMouthLayerEntity)
            .one(connection)
            .await.unwrap().unwrap())
    }
}