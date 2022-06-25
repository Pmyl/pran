use std::sync::Arc;
use std::fmt::Debug;
use thiserror::Error;
use crate::application::emotions::dtos::emotion_dto::EmotionDto;
use crate::domain::emotions::emotion::{Emotion, EmotionName};
use crate::domain::emotions::emotion_repository::{EmotionInsertError, EmotionRepository};

#[derive(Debug, Error)]
pub enum CreateEmotionError {
    #[error("Bad request")]
    BadRequest(String),
    #[error("Emotion with name {0:?} already exists")]
    Conflict(EmotionName),
    #[error("Unexpected error")]
    Unexpected(String),
}

pub struct CreateEmotionRequest {
    pub name: String
}

pub async fn create_emotion(request: CreateEmotionRequest, repository: &Arc<dyn EmotionRepository>) -> Result<EmotionDto, CreateEmotionError> {
    let name = EmotionName::new(request.name)
        .map_err(|_| CreateEmotionError::BadRequest(String::from("Provided `name` is invalid")))?;

    if !repository.exists_with_name(&name).await {
        let emotion = Emotion::new_empty(repository.next_id(), name);
        repository.insert(&emotion).await.map_err(|error| match error {
            EmotionInsertError::Unexpected(message) => CreateEmotionError::Unexpected(message),
            EmotionInsertError::Conflict => CreateEmotionError::Unexpected("Should not have encountered a conflict after the check".to_string())
        })?;

        Ok(emotion.into())
    } else {
        Err(CreateEmotionError::Conflict(name))
    }
}

#[cfg(test)]
mod tests {
    use crate::application::emotions::dtos::emotion_dto::EmotionLayerDto;
    use crate::domain::emotions::emotion::EmotionId;
    use crate::persistence::emotions::in_memory_emotion_repository::InMemoryEmotionRepository;
    use super::*;

    #[test]
    fn create_emotion_return_new_emotion() {
        let name = String::from("happy");
        let request = CreateEmotionRequest { name: name.clone() };
        let repository: Arc<dyn EmotionRepository> = Arc::new(InMemoryEmotionRepository::new());

        match create_emotion(request, &repository) {
            Ok(emotion) => assert_eq!(emotion.name, name),
            _ => unreachable!("expected create emotion to not fail")
        }
    }

    #[test]
    fn create_emotion_return_new_emotion_with_only_mouth_layer() {
        let request = CreateEmotionRequest { name: String::from("happy") };
        let repository: Arc<dyn EmotionRepository> = Arc::new(InMemoryEmotionRepository::new());

        match create_emotion(request, &repository) {
            Ok(emotion) => {
                assert_eq!(emotion.animation.len(), 1);
                assert!(matches!(emotion.animation.first().unwrap(), EmotionLayerDto::Mouth { .. }));
            },
            _ => unreachable!("expected create emotion to not fail")
        }
    }

    #[test]
    fn create_emotion_return_new_emotion_without_mouth_mapping() {
        let request = CreateEmotionRequest { name: String::from("happy") };
        let repository: Arc<dyn EmotionRepository> = Arc::new(InMemoryEmotionRepository::new());

        match create_emotion(request, &repository) {
            Ok(emotion) => {
                assert!(matches!(emotion.animation.first().unwrap(), EmotionLayerDto::Mouth { mouth_mapping } if mouth_mapping.len() == 0));
            },
            _ => unreachable!("expected create emotion to not fail")
        }
    }

    #[test]
    fn create_emotion_save_emotion_in_repository() {
        let request = CreateEmotionRequest { name: String::from("sad") };
        let repository = Arc::new(InMemoryEmotionRepository::new());

        match create_emotion(request, &(repository.clone() as Arc<dyn EmotionRepository>)) {
            Ok(emotion) => assert!(repository.exists(&EmotionId(emotion.id))),
            _ => unreachable!("expected create emotion to not fail")
        }
    }

    #[test]
    fn create_emotion_empty_name_error() {
        let request = CreateEmotionRequest { name: String::from("") };
        let repository: Arc<dyn EmotionRepository> = Arc::new(InMemoryEmotionRepository::new());

        match create_emotion(request, &repository) {
            Err(error) => match error {
                CreateEmotionError::BadRequest(_) => {},
                _ => unreachable!("expected create emotion to fail with bad request")
            },
            _ => unreachable!("expected create emotion to fail")
        }
    }

    #[test]
    fn create_emotion_twice_same_name_conflict_error() {
        let name = String::from("sad");
        let request1 = CreateEmotionRequest { name: name.clone() };
        let request2 = CreateEmotionRequest { name: name.clone() };
        let repository: Arc<dyn EmotionRepository> = Arc::new(InMemoryEmotionRepository::new());
        create_emotion(request1, &repository.clone()).unwrap();

        match create_emotion(request2, &repository) {
            Err(error) => match error {
                CreateEmotionError::Conflict(_) => {},
                _ => unreachable!("expected create emotion to fail with conflict")
            },
            _ => unreachable!("expected create emotion to fail")
        }
    }

    #[test]
    fn create_emotion_twice_different_name_not_fail() {
        let request1 = CreateEmotionRequest { name: String::from("happy") };
        let request2 = CreateEmotionRequest { name: String::from("sad") };
        let repository: Arc<dyn EmotionRepository> = Arc::new(InMemoryEmotionRepository::new());
        create_emotion(request1, &repository.clone()).unwrap();

        match create_emotion(request2, &repository) {
            Ok(_) => {},
            _ => unreachable!("expected create emotion to not fail")
        }
    }
}
