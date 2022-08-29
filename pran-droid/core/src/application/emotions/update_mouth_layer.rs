use std::fmt::Debug;
use thiserror::Error;
use crate::application::emotions::dtos::emotion_dto::EmotionDto;
use crate::domain::emotions::emotion::{AnyLayerId, EmotionId, MouthPositionName};
use crate::domain::emotions::emotion_domain_service::{set_mouth_position, SetMouthPositionToEmotionError};
use crate::domain::emotions::emotion_repository::{EmotionRepository};
use crate::domain::images::image::ImageId;
use crate::domain::images::image_repository::ImageRepository;

#[derive(Debug, Error)]
pub enum UpdateEmotionMouthMappingError {
    #[error("Bad request")]
    BadRequest(String),
}

pub struct UpdateEmotionMouthMappingElementRequest {
    pub name: String,
    pub image_id: String
}

pub struct UpdateEmotionMouthLayerRequest {
    pub emotion_id: String,
    pub parent_id: Option<String>,
    pub mapping: Vec<UpdateEmotionMouthMappingElementRequest>,
}

pub async fn update_emotion_mouth_layer(request: UpdateEmotionMouthLayerRequest, repository: &dyn EmotionRepository, image_repository: &dyn ImageRepository) -> Result<(), UpdateEmotionMouthMappingError> {
    if let Some(parent_id) = &request.parent_id {
        EmotionDto::assert_id_is_not_mouth_reserved_string(parent_id)
            .map_err(|_| UpdateEmotionMouthMappingError::BadRequest(format!("Mouth layer cannot have itself as parent")))?;
    }

    let mut emotion = repository.get(&EmotionId(request.emotion_id.clone()))
        .await
        .ok_or_else(|| UpdateEmotionMouthMappingError::BadRequest(format!("Emotion with id {:?} does not exists", request.emotion_id)))?;

    let parent_id = request.parent_id.map(|id| AnyLayerId(id.clone()));
    emotion.update_mouth_layer(parent_id).map_err(|err| UpdateEmotionMouthMappingError::BadRequest(err))?;

    for element in request.mapping.into_iter() {
        match (ImageId::try_from(element.image_id), MouthPositionName::try_from(element.name)) {
            (Ok(image_id), Ok(position_name)) => {
                set_mouth_position(&mut emotion, position_name, image_id, image_repository)
                    .await
                    .map_err(|error| match error {
                        SetMouthPositionToEmotionError::ImageNotFound(error) => UpdateEmotionMouthMappingError::BadRequest(format!("Image not found {}", error))
                    })?;
            },
            _ => return Err(UpdateEmotionMouthMappingError::BadRequest(String::from("Image id or mouth position name invalid")))
        }
    }

    repository.update(&emotion).await.unwrap();
    Ok(())
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;
    use crate::application::emotions::dtos::emotion_dto::{EmotionDto, EmotionLayerDto, MOUTH_LAYER_ID};
    use crate::application::emotions::get::{get_emotion, GetEmotionRequest};
    use crate::application::emotions::update_layer::{AddEmotionAnimationLayerRequest, update_emotion_animation_layer};
    use crate::domain::emotions::emotion_repository::tests::setup_dummy_emotion;
    use crate::domain::images::image_repository::tests::setup_dummy_images;
    use crate::persistence::emotions::in_memory_emotion_repository::InMemoryEmotionRepository;
    use crate::persistence::images::in_memory_image_repository::InMemoryImageRepository;
    use super::*;

    #[tokio::test]
    async fn update_emotion_mouth_layer_wrong_emotion_id_return_error() {
        let repository = InMemoryEmotionRepository::new();
        let image_repository = InMemoryImageRepository::new();
        setup_dummy_emotion(&repository).await;
        setup_dummy_images(vec!["id1"], &image_repository).await;

        let request = UpdateEmotionMouthLayerRequest {
            emotion_id: String::from("not existing id"),
            parent_id: None,
            mapping: vec![UpdateEmotionMouthMappingElementRequest {
                name: element_name_ah(),
                image_id: String::from("id1")
            }]
        };

        match update_emotion_mouth_layer(request, &repository, &image_repository).await {
            Ok(_) => unreachable!("expected update emotion mouth layer to fail"),
            Err(error) => match error {
                UpdateEmotionMouthMappingError::BadRequest(_) => {}
            }
        }
    }

    #[tokio::test]
    async fn update_emotion_mouth_layer_mouth_parent_id_return_error() {
        let repository = InMemoryEmotionRepository::new();
        let image_repository = InMemoryImageRepository::new();
        let emotion = setup_dummy_emotion(&repository).await;
        setup_dummy_images(vec!["id1"], &image_repository).await;

        let request = UpdateEmotionMouthLayerRequest {
            emotion_id: emotion.id.0.clone(),
            parent_id: Some(String::from(MOUTH_LAYER_ID)),
            mapping: vec![UpdateEmotionMouthMappingElementRequest {
                name: element_name_ah(),
                image_id: String::from("id1")
            }]
        };

        match update_emotion_mouth_layer(request, &repository, &image_repository).await {
            Err(UpdateEmotionMouthMappingError::BadRequest(error)) if error.to_lowercase().contains("parent") => {},
            _ => unreachable!("expected update emotion mouth layer to fail")
        }
    }

    #[tokio::test]
    async fn update_emotion_mouth_layer_correct_input_returns_nothing() {
        let repository = InMemoryEmotionRepository::new();
        let image_repository = InMemoryImageRepository::new();
        let emotion = setup_dummy_emotion(&repository).await;
        setup_dummy_images(vec!["id1"], &image_repository).await;

        let request = UpdateEmotionMouthLayerRequest {
            emotion_id: emotion.id.0,
            parent_id: None,
            mapping: vec![UpdateEmotionMouthMappingElementRequest {
                name: element_name_ah(),
                image_id: String::from("id1")
            }]
        };

        update_emotion_mouth_layer(request, &repository, &image_repository).await
            .expect("expected update emotion mouth layer not to fail");
    }

    #[tokio::test]
    async fn update_emotion_mouth_layer_correct_input_updates_emotion() {
        let repository = InMemoryEmotionRepository::new();
        let image_repository = InMemoryImageRepository::new();
        let emotion = setup_dummy_emotion(&repository).await;
        setup_dummy_images(vec!["id1", "id2"], &image_repository).await;

        let request = UpdateEmotionMouthLayerRequest {
            emotion_id: emotion.id.0.clone(),
            parent_id: None,
            mapping: vec![UpdateEmotionMouthMappingElementRequest {
                name: element_name_ah(),
                image_id: String::from("id1")
            }, UpdateEmotionMouthMappingElementRequest {
                name: element_name_oh(),
                image_id: String::from("id2")
            }]
        };

        match update_emotion_mouth_layer(request, &repository, &image_repository).await {
            Ok(_) => {
                match get_emotion(GetEmotionRequest { id: emotion.id.0 }, &repository).await {
                    Some(emotion) => {
                        let mouth_mapping = get_mouth_mapping(emotion);
                        assert!(mouth_mapping.contains_key(&element_name_ah()));
                        assert_eq!(mouth_mapping.get(&element_name_ah()).unwrap(), "id1");

                        assert!(mouth_mapping.contains_key(&element_name_oh()));
                        assert_eq!(mouth_mapping.get(&element_name_oh()).unwrap(), "id2");
                    },
                    None => unreachable!("emotion should have existed")
                }
            },
            Err(_) => unreachable!("expected update emotion mouth layer not to fail")
        }
    }

    #[tokio::test]
    async fn update_emotion_mouth_layer_of_unknown_position_returns_error() {
        let repository = InMemoryEmotionRepository::new();
        let image_repository = InMemoryImageRepository::new();
        let emotion = setup_dummy_emotion(&repository).await;
        setup_dummy_images(vec!["id1", "id2"], &image_repository).await;

        let request = UpdateEmotionMouthLayerRequest {
            emotion_id: emotion.id.0.clone(),
            parent_id: None,
            mapping: vec![UpdateEmotionMouthMappingElementRequest {
                name: String::from("not existing mouth position"),
                image_id: String::from("id1")
            }]
        };

        match update_emotion_mouth_layer(request, &repository, &image_repository).await {
            Ok(_) => unreachable!("expected update emotion mouth layer to fail"),
            Err(error) => match error {
                UpdateEmotionMouthMappingError::BadRequest(_) => {}
            }
        }
    }

    #[tokio::test]
    async fn update_emotion_mouth_layer_of_unknown_image_id_returns_error() {
        let repository = InMemoryEmotionRepository::new();
        let image_repository = InMemoryImageRepository::new();
        let emotion = setup_dummy_emotion(&repository).await;
        setup_dummy_images(vec!["id1", "id2"], &image_repository).await;

        let request = UpdateEmotionMouthLayerRequest {
            emotion_id: emotion.id.0.clone(),
            parent_id: None,
            mapping: vec![UpdateEmotionMouthMappingElementRequest {
                name: element_name_ah(),
                image_id: String::from("id3")
            }]
        };

        match update_emotion_mouth_layer(request, &repository, &image_repository).await {
            Ok(_) => unreachable!("expected update emotion mouth layer to fail"),
            Err(error) => match error {
                UpdateEmotionMouthMappingError::BadRequest(_) => {}
            }
        }
    }

    #[tokio::test]
    async fn update_emotion_mouth_layer_existing_positions_replace_mappings() {
        let repository = InMemoryEmotionRepository::new();
        let image_repository = InMemoryImageRepository::new();
        let emotion = setup_dummy_emotion(&repository).await;
        setup_dummy_images(vec!["id1", "id2", "id4"], &image_repository).await;

        update_emotion_mouth_layer(UpdateEmotionMouthLayerRequest {
            emotion_id: emotion.id.0.clone(),
            parent_id: None,
            mapping: vec![UpdateEmotionMouthMappingElementRequest {
                name: element_name_ah(),
                image_id: String::from("id1")
            }, UpdateEmotionMouthMappingElementRequest {
                name: element_name_oh(),
                image_id: String::from("id2")
            }]
        }, &repository, &image_repository).await.unwrap();

        let request = UpdateEmotionMouthLayerRequest {
            emotion_id: emotion.id.0.clone(),
            parent_id: None,
            mapping: vec![UpdateEmotionMouthMappingElementRequest {
                name: element_name_oh(),
                image_id: String::from("id4")
            }]
        };

        match update_emotion_mouth_layer(request, &repository, &image_repository).await {
            Ok(_) => {
                match get_emotion(GetEmotionRequest { id: emotion.id.0 }, &repository).await {
                    Some(emotion) => {
                        let mouth_mapping = get_mouth_mapping(emotion);
                        assert_eq!(mouth_mapping.len(), 2);
                        assert!(mouth_mapping.contains_key(&element_name_ah()));
                        assert_eq!(mouth_mapping.get(&element_name_ah()).unwrap(), "id1");

                        assert!(mouth_mapping.contains_key(&element_name_oh()));
                        assert_eq!(mouth_mapping.get(&element_name_oh()).unwrap(), "id4");
                    },
                    None => unreachable!("emotion should have existed")
                }
            },
            Err(error) => unreachable!("expected update emotion mouth layer not to fail with {:?}", error)
        }
    }

    #[tokio::test]
    async fn update_emotion_mouth_layer_existing_parent_id_updates_emotion() {
        let repository = InMemoryEmotionRepository::new();
        let image_repository = InMemoryImageRepository::new();
        let emotion = setup_dummy_emotion(&repository).await;
        setup_dummy_images(vec!["id1", "id2"], &image_repository).await;
        update_emotion_animation_layer(AddEmotionAnimationLayerRequest {
            id: String::from("an id"),
            parent_id: None,
            animation: vec![],
            index: 1,
            emotion_id: emotion.id.0.clone()
        }, &repository, &image_repository).await.expect("Update emotion animation layer setup should not fail");

        let request = UpdateEmotionMouthLayerRequest {
            emotion_id: emotion.id.0.clone(),
            parent_id: Some(String::from("an id")),
            mapping: vec![UpdateEmotionMouthMappingElementRequest {
                name: element_name_ah(),
                image_id: String::from("id1")
            }, UpdateEmotionMouthMappingElementRequest {
                name: element_name_oh(),
                image_id: String::from("id2")
            }]
        };

        match update_emotion_mouth_layer(request, &repository, &image_repository).await {
            Ok(_) => {
                match get_emotion(GetEmotionRequest { id: emotion.id.0 }, &repository).await {
                    Some(emotion) => match &emotion.animation[0] {
                        EmotionLayerDto::Mouth { parent_id, ..} => assert_eq!(parent_id, &Some(String::from("an id"))),
                        _ => unreachable!("first layer should have been mouth")
                    },
                    None => unreachable!("emotion should have existed")
                }
            },
            Err(_) => unreachable!("expected update emotion mouth layer")
        }
    }

    #[tokio::test]
    async fn update_emotion_mouth_layer_not_existing_parent_id_returns_error() {
        let repository = InMemoryEmotionRepository::new();
        let image_repository = InMemoryImageRepository::new();
        let emotion = setup_dummy_emotion(&repository).await;
        setup_dummy_images(vec!["id1", "id2"], &image_repository).await;

        let request = UpdateEmotionMouthLayerRequest {
            emotion_id: emotion.id.0.clone(),
            parent_id: Some(String::from("an id")),
            mapping: vec![UpdateEmotionMouthMappingElementRequest {
                name: element_name_ah(),
                image_id: String::from("id1")
            }, UpdateEmotionMouthMappingElementRequest {
                name: element_name_oh(),
                image_id: String::from("id2")
            }]
        };

        match update_emotion_mouth_layer(request, &repository, &image_repository).await {
            Err(UpdateEmotionMouthMappingError::BadRequest(error)) if error.to_lowercase().contains("exists") => {},
            _ => unreachable!("expected update emotion mouth layer to fail")
        }
    }

    fn element_name_ah() -> String {
        MouthPositionName::Ah.into()
    }

    fn element_name_oh() -> String {
        MouthPositionName::Oh.into()
    }

    fn get_mouth_mapping(emotion: EmotionDto) -> HashMap<String, String> {
        emotion.animation.iter()
            .find(|layer| match layer {
                EmotionLayerDto::Animation { .. } => false,
                EmotionLayerDto::Mouth { .. } => true
            })
            .and_then(|layer| match layer {
                EmotionLayerDto::Animation { .. } => None,
                EmotionLayerDto::Mouth { mouth_mapping, .. } => Some(mouth_mapping)
            })
            .cloned()
            .expect("Emotion expected to have a mouth layer")
    }
}
