use std::sync::Arc;
use std::fmt::Debug;
use thiserror::Error;
use crate::application::reactions::dtos::reaction_step_dto::{AnimationFrameDto, frames_dtos_to_animation};
use crate::domain::animations::animation::CreateAnimationError;
use crate::domain::emotions::emotion::{EmotionId};
use crate::domain::emotions::emotion_domain_service::{update_layer_in_emotion};
use crate::domain::emotions::emotion_repository::{EmotionRepository};
use crate::domain::images::image_repository::ImageRepository;

#[derive(Debug, Error)]
pub enum AddEmotionAnimationLayerError {
    #[error("Bad request {0}")]
    BadRequest(String),
    #[error("Wrong animation details {0}")]
    WrongAnimationRequest(#[from] CreateAnimationError),
}

pub struct AddEmotionAnimationLayerRequest {
    pub emotion_id: String,
    pub animation: Vec<AnimationFrameDto>,
    pub index: usize
}

pub fn update_emotion_animation_layer(request: AddEmotionAnimationLayerRequest, repository: &Arc<dyn EmotionRepository>, image_repository: &Arc<dyn ImageRepository>) -> Result<(), AddEmotionAnimationLayerError> {
    let mut emotion = repository.get(&EmotionId(request.emotion_id.clone()))
        .ok_or_else(|| AddEmotionAnimationLayerError::BadRequest(format!("Emotion with id {:?} does not exists", request.emotion_id)))?;

    update_layer_in_emotion(request.index, &mut emotion, frames_dtos_to_animation(request.animation)?, image_repository)
        .map_err(|error| AddEmotionAnimationLayerError::BadRequest(error.0.clone()))?;
    repository.update(&emotion).unwrap();
    Ok(())
}

#[cfg(test)]
mod tests {
    use crate::application::emotions::dtos::emotion_dto::{EmotionLayerDto};
    use crate::application::emotions::get::{get_emotion, GetEmotionRequest};
    use crate::domain::emotions::emotion_repository::tests::setup_dummy_emotion;
    use crate::domain::images::image_repository::{ImageRepository};
    use crate::domain::images::image_repository::tests::setup_dummy_images;
    use crate::persistence::emotions::in_memory_emotion_repository::InMemoryEmotionRepository;
    use crate::persistence::images::in_memory_image_repository::InMemoryImageRepository;
    use super::*;

    #[test]
    fn update_emotion_animation_layer_wrong_id_return_error() {
        let repository: Arc<dyn EmotionRepository> = Arc::new(InMemoryEmotionRepository::new());
        let image_repository: Arc<dyn ImageRepository> = Arc::new(InMemoryImageRepository::new());
        setup_dummy_emotion(&repository);
        setup_dummy_images(vec!["id1"], &image_repository);

        let result = update_emotion_animation_layer(AddEmotionAnimationLayerRequest {
            index: 1,
            emotion_id: String::from("not existing id"),
            animation: vec![]
        }, &repository, &image_repository);

        assert!(matches!(result, Err(AddEmotionAnimationLayerError::BadRequest(_))), "Expected to fail with bad request but was {:?}", result);
    }

    #[test]
    fn update_emotion_animation_layer_correct_input_returns_nothing() {
        let repository: Arc<dyn EmotionRepository> = Arc::new(InMemoryEmotionRepository::new());
        let image_repository: Arc<dyn ImageRepository> = Arc::new(InMemoryImageRepository::new());
        let emotion = setup_dummy_emotion(&repository);
        setup_dummy_images(vec!["id1"], &image_repository);

        update_emotion_animation_layer(AddEmotionAnimationLayerRequest {
            index: 1,
            emotion_id: emotion.id.0,
            animation: vec![]
        }, &repository, &image_repository).expect("expected add emotion animation layer not to fail");
    }

    #[test]
    fn update_emotion_animation_layer_correct_input_updates_emotion() {
        let repository: Arc<dyn EmotionRepository> = Arc::new(InMemoryEmotionRepository::new());
        let image_repository: Arc<dyn ImageRepository> = Arc::new(InMemoryImageRepository::new());
        let emotion = setup_dummy_emotion(&repository);
        setup_dummy_images(vec!["id1", "id2"], &image_repository);

        update_emotion_animation_layer(AddEmotionAnimationLayerRequest {
            index: 1,
            emotion_id: emotion.id.0.clone(),
            animation: vec![
                AnimationFrameDto { frame_start: 0, frame_end: 10, image_id: String::from("id1") },
                AnimationFrameDto { frame_start: 11, frame_end: 20, image_id: String::from("id2") }
            ]
        }, &repository, &image_repository).expect("Expected update not to fail");

        let emotion = get_emotion(GetEmotionRequest { id: emotion.id.0 }, &repository).expect("Emotion expected");
        assert_eq!(emotion.animation.len(), 2);
        assert!(matches!(emotion.animation.get(0).unwrap(), EmotionLayerDto::Mouth));
        assert!(matches!(emotion.animation.get(1).unwrap(), EmotionLayerDto::Animation(_)));

        if let EmotionLayerDto::Animation(layer) = emotion.animation.get(1).unwrap() {
            assert_eq!(layer.len(), 2);
            assert_eq!(layer.get(0).unwrap().image_id, "id1");
            assert_eq!(layer.get(0).unwrap().frame_start, 0);
            assert_eq!(layer.get(0).unwrap().frame_end, 10);

            assert_eq!(layer.get(1).unwrap().image_id, "id2");
            assert_eq!(layer.get(1).unwrap().frame_start, 11);
            assert_eq!(layer.get(1).unwrap().frame_end, 20);
        }
    }

    #[test]
    fn update_emotion_animation_layer_image_not_existing_returns_error() {
        let repository: Arc<dyn EmotionRepository> = Arc::new(InMemoryEmotionRepository::new());
        let image_repository: Arc<dyn ImageRepository> = Arc::new(InMemoryImageRepository::new());
        let emotion = setup_dummy_emotion(&repository);
        setup_dummy_images(vec!["id1", "id2"], &image_repository);

        let result = update_emotion_animation_layer(AddEmotionAnimationLayerRequest {
            index: 1,
            emotion_id: emotion.id.0.clone(),
            animation: vec![
                AnimationFrameDto { frame_start: 0, frame_end: 10, image_id: String::from("id4") },
                AnimationFrameDto { frame_start: 11, frame_end: 20, image_id: String::from("id2") }
            ]
        }, &repository, &image_repository);

        assert!(matches!(result, Err(AddEmotionAnimationLayerError::BadRequest(_))), "Expected to fail with bad request but was {:?}", result);
    }

    #[test]
    fn update_emotion_animation_layer_two_on_incrementing_index_add_both_layers() {
        let repository: Arc<dyn EmotionRepository> = Arc::new(InMemoryEmotionRepository::new());
        let image_repository: Arc<dyn ImageRepository> = Arc::new(InMemoryImageRepository::new());
        let emotion = setup_dummy_emotion(&repository);
        setup_dummy_images(vec!["id1", "id2"], &image_repository);

        update_emotion_animation_layer(AddEmotionAnimationLayerRequest {
            index: 1,
            emotion_id: emotion.id.0.clone(),
            animation: vec![
                AnimationFrameDto { frame_start: 0, frame_end: 10, image_id: String::from("id1") },
                AnimationFrameDto { frame_start: 11, frame_end: 20, image_id: String::from("id2") }
            ]
        }, &repository, &image_repository).expect("Expected first update emotion not to fail");

        update_emotion_animation_layer(AddEmotionAnimationLayerRequest {
            index: 2,
            emotion_id: emotion.id.0.clone(),
            animation: vec![
                AnimationFrameDto { frame_start: 0, frame_end: 10, image_id: String::from("id2") }
            ]
        }, &repository, &image_repository).expect("Expected second update emotion not to fail");

        let emotion = get_emotion(GetEmotionRequest { id: emotion.id.0 }, &repository).expect("Expected emotion");
        assert_eq!(emotion.animation.len(), 3);
        assert!(matches!(emotion.animation.get(0).unwrap(), EmotionLayerDto::Mouth));
        assert!(matches!(emotion.animation.get(1).unwrap(), EmotionLayerDto::Animation(_)));
        assert!(matches!(emotion.animation.get(2).unwrap(), EmotionLayerDto::Animation(_)));

        if let EmotionLayerDto::Animation(layer) = emotion.animation.get(1).unwrap() {
            assert_eq!(layer.len(), 2);
            assert_eq!(layer.get(0).unwrap().image_id, "id1");
            assert_eq!(layer.get(0).unwrap().frame_start, 0);
            assert_eq!(layer.get(0).unwrap().frame_end, 10);

            assert_eq!(layer.get(1).unwrap().image_id, "id2");
            assert_eq!(layer.get(1).unwrap().frame_start, 11);
            assert_eq!(layer.get(1).unwrap().frame_end, 20);
        }

        if let EmotionLayerDto::Animation(layer) = emotion.animation.get(2).unwrap() {
            assert_eq!(layer.len(), 1);
            assert_eq!(layer.get(0).unwrap().image_id, "id2");
            assert_eq!(layer.get(0).unwrap().frame_start, 0);
            assert_eq!(layer.get(0).unwrap().frame_end, 10);
        }
    }

    #[test]
    fn update_emotion_animation_layer_with_mouth_layer_index_error() {
        let repository: Arc<dyn EmotionRepository> = Arc::new(InMemoryEmotionRepository::new());
        let image_repository: Arc<dyn ImageRepository> = Arc::new(InMemoryImageRepository::new());
        let emotion = setup_dummy_emotion(&repository);
        setup_dummy_images(vec!["id1", "id2"], &image_repository);

        let result = update_emotion_animation_layer(AddEmotionAnimationLayerRequest {
            index: 0,
            emotion_id: emotion.id.0.clone(),
            animation: vec![
                AnimationFrameDto { frame_start: 0, frame_end: 10, image_id: String::from("id1") },
                AnimationFrameDto { frame_start: 11, frame_end: 20, image_id: String::from("id2") }
            ]
        }, &repository, &image_repository);

        assert!(matches!(result, Err(AddEmotionAnimationLayerError::BadRequest(_))), "Expected to fail with bad request but was {:?}", result);
    }

    #[test]
    fn update_emotion_animation_layer_with_out_of_bounds_index_returns_error() {
        let repository: Arc<dyn EmotionRepository> = Arc::new(InMemoryEmotionRepository::new());
        let image_repository: Arc<dyn ImageRepository> = Arc::new(InMemoryImageRepository::new());
        let emotion = setup_dummy_emotion(&repository);
        setup_dummy_images(vec!["id1", "id2"], &image_repository);

        let result = update_emotion_animation_layer(AddEmotionAnimationLayerRequest {
            index: 2,
            emotion_id: emotion.id.0.clone(),
            animation: vec![
                AnimationFrameDto { frame_start: 0, frame_end: 10, image_id: String::from("id1") },
                AnimationFrameDto { frame_start: 11, frame_end: 20, image_id: String::from("id2") }
            ]
        }, &repository, &image_repository);

        assert!(matches!(result, Err(AddEmotionAnimationLayerError::BadRequest(_))), "Expected to fail with bad request but was {:?}", result);
    }

    #[test]
    fn update_emotion_animation_layer_with_existing_custom_layer_index_then_replace_layer() {
        let repository: Arc<dyn EmotionRepository> = Arc::new(InMemoryEmotionRepository::new());
        let image_repository: Arc<dyn ImageRepository> = Arc::new(InMemoryImageRepository::new());
        let emotion = setup_dummy_emotion(&repository);
        setup_dummy_images(vec!["id1", "id2"], &image_repository);

        update_emotion_animation_layer(AddEmotionAnimationLayerRequest {
            index: 1,
            emotion_id: emotion.id.0.clone(),
            animation: vec![
                AnimationFrameDto { frame_start: 0, frame_end: 10, image_id: String::from("id1") },
                AnimationFrameDto { frame_start: 11, frame_end: 20, image_id: String::from("id2") }
            ]
        }, &repository, &image_repository).expect("Expected update not to fail");

        update_emotion_animation_layer(AddEmotionAnimationLayerRequest {
            index: 1,
            emotion_id: emotion.id.0.clone(),
            animation: vec![
                AnimationFrameDto { frame_start: 5, frame_end: 11, image_id: String::from("id2") },
                AnimationFrameDto { frame_start: 12, frame_end: 23, image_id: String::from("id1") }
            ]
        }, &repository, &image_repository).expect("Expected update not to fail");

        let emotion = get_emotion(GetEmotionRequest { id: emotion.id.0 }, &repository).expect("Expected emotion");
        assert_eq!(emotion.animation.len(), 2);
        assert!(matches!(emotion.animation.get(0).unwrap(), EmotionLayerDto::Mouth));
        assert!(matches!(emotion.animation.get(1).unwrap(), EmotionLayerDto::Animation(_)));

        if let EmotionLayerDto::Animation(layer) = emotion.animation.get(1).unwrap() {
            assert_eq!(layer.len(), 2);
            assert_eq!(layer.get(0).unwrap().image_id, "id2");
            assert_eq!(layer.get(0).unwrap().frame_start, 5);
            assert_eq!(layer.get(0).unwrap().frame_end, 11);

            assert_eq!(layer.get(1).unwrap().image_id, "id1");
            assert_eq!(layer.get(1).unwrap().frame_start, 12);
            assert_eq!(layer.get(1).unwrap().frame_end, 23);
        }
    }
}
