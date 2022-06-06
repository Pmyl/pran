use std::sync::Arc;
use std::fmt::Debug;
use thiserror::Error;
use crate::domain::emotions::emotion::{EmotionId, MouthPositionName};
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

pub struct UpdateEmotionMouthMappingRequest {
    pub emotion_id: String,
    pub mapping: Vec<UpdateEmotionMouthMappingElementRequest>
}

pub fn update_emotion_mouth_mapping(request: UpdateEmotionMouthMappingRequest, repository: &Arc<dyn EmotionRepository>, image_repository: &Arc<dyn ImageRepository>) -> Result<(), UpdateEmotionMouthMappingError> {
    let mut emotion = repository.get(&EmotionId(request.emotion_id.clone()))
        .ok_or_else(|| UpdateEmotionMouthMappingError::BadRequest(format!("Emotion with id {:?} does not exists", request.emotion_id)))?;

    for element in request.mapping.into_iter() {
        match (ImageId::try_from(element.image_id), MouthPositionName::try_from(element.name)) {
            (Ok(image_id), Ok(position_name)) =>
                set_mouth_position(&mut emotion, position_name, image_id, image_repository)
                    .map_err(|error| match error {
                        SetMouthPositionToEmotionError::ImageNotFound(error) => UpdateEmotionMouthMappingError::BadRequest(format!("Image not found {}", error))
                    })?,
            _ => return Err(UpdateEmotionMouthMappingError::BadRequest(String::from("Image id or mouth position name invalid")))
        }
    }

    repository.update(&emotion).unwrap();
    Ok(())
}

#[cfg(test)]
mod tests {
    use crate::application::emotions::get::{get_emotion, GetEmotionRequest};
    use crate::domain::emotions::emotion_repository::tests::setup_dummy_emotion;
    use crate::domain::images::image_repository::ImageRepository;
    use crate::domain::images::image_repository::tests::setup_dummy_images;
    use crate::persistence::emotions::in_memory_emotion_repository::InMemoryEmotionRepository;
    use crate::persistence::images::in_memory_image_repository::InMemoryImageRepository;
    use super::*;

    #[test]
    fn update_emotion_mouth_mapping_wrong_id_return_error() {
        let repository: Arc<dyn EmotionRepository> = Arc::new(InMemoryEmotionRepository::new());
        let image_repository: Arc<dyn ImageRepository> = Arc::new(InMemoryImageRepository::new());
        setup_dummy_emotion(&repository);
        setup_dummy_images(vec!["id1"], &image_repository);

        let request = UpdateEmotionMouthMappingRequest {
            emotion_id: String::from("not existing id"),
            mapping: vec![UpdateEmotionMouthMappingElementRequest {
                name: element_name_aah(),
                image_id: String::from("id1")
            }]
        };

        match update_emotion_mouth_mapping(request, &repository, &image_repository) {
            Ok(_) => unreachable!("expected update emotion mouth mapping to fail"),
            Err(error) => match error {
                UpdateEmotionMouthMappingError::BadRequest(_) => {}
            }
        }
    }

    #[test]
    fn update_emotion_mouth_mapping_correct_input_returns_nothing() {
        let repository: Arc<dyn EmotionRepository> = Arc::new(InMemoryEmotionRepository::new());
        let image_repository: Arc<dyn ImageRepository> = Arc::new(InMemoryImageRepository::new());
        let emotion = setup_dummy_emotion(&repository);
        setup_dummy_images(vec!["id1"], &image_repository);

        let request = UpdateEmotionMouthMappingRequest {
            emotion_id: emotion.id.0,
            mapping: vec![UpdateEmotionMouthMappingElementRequest {
                name: element_name_aah(),
                image_id: String::from("id1")
            }]
        };

        match update_emotion_mouth_mapping(request, &repository, &image_repository) {
            Ok(_) => {},
            Err(_) => unreachable!("expected update emotion mouth mapping not to fail")
        }
    }

    #[test]
    fn update_emotion_mouth_mapping_correct_input_updates_emotion() {
        let repository: Arc<dyn EmotionRepository> = Arc::new(InMemoryEmotionRepository::new());
        let image_repository: Arc<dyn ImageRepository> = Arc::new(InMemoryImageRepository::new());
        let emotion = setup_dummy_emotion(&repository);
        setup_dummy_images(vec!["id1", "id2"], &image_repository);

        let request = UpdateEmotionMouthMappingRequest {
            emotion_id: emotion.id.0.clone(),
            mapping: vec![UpdateEmotionMouthMappingElementRequest {
                name: element_name_aah(),
                image_id: String::from("id1")
            }, UpdateEmotionMouthMappingElementRequest {
                name: element_name_o(),
                image_id: String::from("id2")
            }]
        };

        match update_emotion_mouth_mapping(request, &repository, &image_repository) {
            Ok(_) => {
                match get_emotion(GetEmotionRequest { id: emotion.id.0 }, &repository) {
                    Some(emotion) => {
                        assert!(emotion.mouth_mapping.contains_key(&element_name_aah()));
                        assert_eq!(emotion.mouth_mapping.get(&element_name_aah()).unwrap(), "id1");

                        assert!(emotion.mouth_mapping.contains_key(&element_name_o()));
                        assert_eq!(emotion.mouth_mapping.get(&element_name_o()).unwrap(), "id2");
                    },
                    None => unreachable!("emotion should have existed")
                }
            },
            Err(_) => unreachable!("expected update emotion mouth mapping not to fail")
        }
    }

    #[test]
    fn update_emotion_mouth_mapping_of_unknown_position_returns_error() {
        let repository: Arc<dyn EmotionRepository> = Arc::new(InMemoryEmotionRepository::new());
        let image_repository: Arc<dyn ImageRepository> = Arc::new(InMemoryImageRepository::new());
        let emotion = setup_dummy_emotion(&repository);
        setup_dummy_images(vec!["id1", "id2"], &image_repository);

        let request = UpdateEmotionMouthMappingRequest {
            emotion_id: emotion.id.0.clone(),
            mapping: vec![UpdateEmotionMouthMappingElementRequest {
                name: String::from("not existing mouth position"),
                image_id: String::from("id1")
            }]
        };

        match update_emotion_mouth_mapping(request, &repository, &image_repository) {
            Ok(_) => unreachable!("expected update emotion mouth mapping to fail"),
            Err(error) => match error {
                UpdateEmotionMouthMappingError::BadRequest(_) => {}
            }
        }
    }

    #[test]
    fn update_emotion_mouth_mapping_of_unknown_image_id_returns_error() {
        let repository: Arc<dyn EmotionRepository> = Arc::new(InMemoryEmotionRepository::new());
        let image_repository: Arc<dyn ImageRepository> = Arc::new(InMemoryImageRepository::new());
        let emotion = setup_dummy_emotion(&repository);
        setup_dummy_images(vec!["id1", "id2"], &image_repository);

        let request = UpdateEmotionMouthMappingRequest {
            emotion_id: emotion.id.0.clone(),
            mapping: vec![UpdateEmotionMouthMappingElementRequest {
                name: element_name_aah(),
                image_id: String::from("id3")
            }]
        };

        match update_emotion_mouth_mapping(request, &repository, &image_repository) {
            Ok(_) => unreachable!("expected update emotion mouth mapping to fail"),
            Err(error) => match error {
                UpdateEmotionMouthMappingError::BadRequest(_) => {}
            }
        }
    }

    #[test]
    fn update_emotion_mouth_mapping_existing_positions_replace_mappings() {
        let repository: Arc<dyn EmotionRepository> = Arc::new(InMemoryEmotionRepository::new());
        let image_repository: Arc<dyn ImageRepository> = Arc::new(InMemoryImageRepository::new());
        let emotion = setup_dummy_emotion(&repository);
        setup_dummy_images(vec!["id1", "id2", "id4"], &image_repository);

        update_emotion_mouth_mapping(UpdateEmotionMouthMappingRequest {
            emotion_id: emotion.id.0.clone(),
            mapping: vec![UpdateEmotionMouthMappingElementRequest {
                name: element_name_aah(),
                image_id: String::from("id1")
            }, UpdateEmotionMouthMappingElementRequest {
                name: element_name_o(),
                image_id: String::from("id2")
            }]
        }, &repository, &image_repository).unwrap();

        let request = UpdateEmotionMouthMappingRequest {
            emotion_id: emotion.id.0.clone(),
            mapping: vec![UpdateEmotionMouthMappingElementRequest {
                name: element_name_o(),
                image_id: String::from("id4")
            }]
        };

        match update_emotion_mouth_mapping(request, &repository, &image_repository) {
            Ok(_) => {
                match get_emotion(GetEmotionRequest { id: emotion.id.0 }, &repository) {
                    Some(emotion) => {
                        assert_eq!(emotion.mouth_mapping.len(), 2);
                        assert!(emotion.mouth_mapping.contains_key(&element_name_aah()));
                        assert_eq!(emotion.mouth_mapping.get(&element_name_aah()).unwrap(), "id1");

                        assert!(emotion.mouth_mapping.contains_key(&element_name_o()));
                        assert_eq!(emotion.mouth_mapping.get(&element_name_o()).unwrap(), "id4");
                    },
                    None => unreachable!("emotion should have existed")
                }
            },
            Err(error) => unreachable!("expected update emotion mouth mapping not to fail with {:?}", error)
        }
    }

    fn element_name_aah() -> String {
        String::from("aah")
    }

    fn element_name_o() -> String {
        String::from("o")
    }
}
