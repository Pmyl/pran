use std::collections::HashMap;
use std::fmt::Debug;
use thiserror::Error;
use crate::application::reactions::dtos::reaction_step_dto::{AnimationFrameDto, frames_dtos_to_animation};
use crate::domain::animations::animation::CreateAnimationError;
use crate::domain::emotions::emotion::{AnyLayerId, EmotionId, EmotionLayerId, MouthLayerId};
use crate::domain::emotions::emotion_domain_service::{update_layer_in_emotion};
use crate::domain::emotions::emotion_repository::{EmotionRepository};
use crate::domain::images::image_repository::ImageRepository;
use crate::application::emotions::dtos::emotion_dto::{EmotionDto, into_translations, MOUTH_LAYER_ID};

#[derive(Debug, Error)]
pub enum AddEmotionAnimationLayerError {
    #[error("Bad request {0}")]
    BadRequest(String),
    #[error("Wrong animation details {0}")]
    WrongAnimationRequest(#[from] CreateAnimationError),
}

pub struct AddEmotionAnimationLayerRequest {
    pub emotion_id: String,
    pub id: String,
    pub parent_id: Option<String>,
    pub animation: Vec<AnimationFrameDto>,
    pub translations: Option<HashMap<u32, (u32, u32)>>,
    pub index: usize
}

pub async fn update_emotion_animation_layer(request: AddEmotionAnimationLayerRequest, repository: &dyn EmotionRepository, image_repository: &dyn ImageRepository) -> Result<(), AddEmotionAnimationLayerError> {
    EmotionDto::assert_id_is_not_mouth_reserved_string(&request.id)
        .map_err(|_| AddEmotionAnimationLayerError::BadRequest(format!("Layer ids cannot be {} because it's reserved for the mouth layer", MOUTH_LAYER_ID)))?;

    let mut emotion = repository.get(&EmotionId(request.emotion_id.clone()))
        .await
        .ok_or_else(|| AddEmotionAnimationLayerError::BadRequest(format!("Emotion with id {:?} does not exists", request.emotion_id)))?;

    let parent_id = request.parent_id.map(into_emotion_layer_id);
    update_layer_in_emotion(request.index,
                            &mut emotion,
                            AnyLayerId(request.id),
                            parent_id,
                            frames_dtos_to_animation(request.animation)?,
                            into_translations(request.translations),
                            image_repository)
        .await
        .map_err(|error| AddEmotionAnimationLayerError::BadRequest(error.0.clone()))?;
    repository.update(&emotion).await.unwrap();
    Ok(())
}

fn into_emotion_layer_id(id_string: String) -> EmotionLayerId {
    match id_string.as_str() {
        MOUTH_LAYER_ID => EmotionLayerId::Mouth(MouthLayerId),
        _ => EmotionLayerId::Custom(AnyLayerId(id_string.clone()))
    }
}

#[cfg(test)]
mod tests {
    use crate::application::emotions::dtos::emotion_dto::{EmotionLayerDto};
    use crate::application::emotions::get::{get_emotion, GetEmotionRequest};
    use crate::domain::emotions::emotion::Emotion;
    use crate::domain::emotions::emotion_repository::tests::setup_dummy_emotion;
    use crate::domain::images::image_repository::tests::setup_dummy_images;
    use crate::persistence::emotions::in_memory_emotion_repository::InMemoryEmotionRepository;
    use crate::persistence::images::in_memory_image_repository::InMemoryImageRepository;
    use super::*;

    #[tokio::test]
    async fn update_emotion_animation_layer_wrong_id_return_error() {
        let repository = InMemoryEmotionRepository::new();
        let image_repository = InMemoryImageRepository::new();
        let emotion = setup_dummy_emotion(&repository).await;
        setup_base_dummy_images(&image_repository).await;

        let result = update_emotion_animation_layer(create_request(&emotion, |req| {
            req.emotion_id = String::from("not existing id");
        }), &repository, &image_repository).await;

        assert!(matches!(result, Err(AddEmotionAnimationLayerError::BadRequest(_))), "Expected to fail with bad request but was {:?}", result);
    }

    #[tokio::test]
    async fn update_emotion_animation_layer_correct_input_returns_nothing() {
        let repository = InMemoryEmotionRepository::new();
        let image_repository = InMemoryImageRepository::new();
        let emotion = setup_dummy_emotion(&repository).await;
        setup_base_dummy_images(&image_repository).await;

        update_emotion_animation_layer(
            create_request(&emotion, |_| {}),
            &repository,
            &image_repository
        ).await.expect("expected add emotion animation layer not to fail");
    }

    #[tokio::test]
    async fn update_emotion_animation_layer_correct_input_updates_emotion() {
        let repository = InMemoryEmotionRepository::new();
        let image_repository = InMemoryImageRepository::new();
        let emotion = setup_dummy_emotion(&repository).await;
        setup_base_dummy_images(&image_repository).await;

        update_emotion_animation_layer(create_request(&emotion, |req| {
            req.index = 1;
            req.id = String::from("an id");
            req.animation = vec![
                AnimationFrameDto { frame_start: 0, frame_end: 10, image_id: String::from("id1") },
                AnimationFrameDto { frame_start: 11, frame_end: 20, image_id: String::from("id2") }
            ];
            req.translations = Some(HashMap::from([
                (0, (10, 11)),
                (3, (45, 57)),
            ]));
        }), &repository, &image_repository).await.expect("Expected update not to fail");

        let emotion = get_emotion(GetEmotionRequest { id: emotion.id.0 }, &repository).await.expect("Emotion expected");
        assert_eq!(emotion.animation.len(), 2);
        assert!(matches!(emotion.animation.get(0).unwrap(), EmotionLayerDto::Mouth { .. }));
        assert!(matches!(emotion.animation.get(1).unwrap(), EmotionLayerDto::Animation { .. }));

        if let EmotionLayerDto::Animation { id, animation: layer, parent_id, translations } = emotion.animation.get(1).unwrap() {
            assert_eq!(id, "an id");
            assert_eq!(parent_id, &None);
            assert_eq!(layer.len(), 2);
            assert_eq!(layer.get(0).unwrap().image_id, "id1");
            assert_eq!(layer.get(0).unwrap().frame_start, 0);
            assert_eq!(layer.get(0).unwrap().frame_end, 10);

            assert_eq!(layer.get(1).unwrap().image_id, "id2");
            assert_eq!(layer.get(1).unwrap().frame_start, 11);
            assert_eq!(layer.get(1).unwrap().frame_end, 20);

            assert_eq!(translations.len(), 2);
            assert!(matches!(translations.get(&0), Some(translation) if translation.0 == 10 && translation.1 == 11));
            assert!(matches!(translations.get(&3), Some(translation) if translation.0 == 45 && translation.1 == 57));
        }
    }

    #[tokio::test]
    async fn update_emotion_animation_layer_id_already_exists_at_different_index_returns_error() {
        let repository = InMemoryEmotionRepository::new();
        let image_repository = InMemoryImageRepository::new();
        let emotion = setup_dummy_emotion(&repository).await;
        setup_base_dummy_images(&image_repository).await;

        update_emotion_animation_layer(create_request(&emotion, |req| {
            req.id = String::from("an id");
        }), &repository, &image_repository).await.expect("Expected update not to fail");

        let result = update_emotion_animation_layer(create_request(&emotion, |req| {
            req.index = 2;
            req.id = String::from("an id");
        }), &repository, &image_repository).await;

        assert!(matches!(result, Err(AddEmotionAnimationLayerError::BadRequest(error)) if error.to_lowercase().contains("duplicate")));
    }

    #[tokio::test]
    async fn update_emotion_animation_layer_id_is_reserved_mouth_string_returns_error() {
        let repository = InMemoryEmotionRepository::new();
        let image_repository = InMemoryImageRepository::new();
        let emotion = setup_dummy_emotion(&repository).await;
        setup_base_dummy_images(&image_repository).await;

        let result = update_emotion_animation_layer(create_request(&emotion, |req| {
            req.id = String::from(MOUTH_LAYER_ID);
        }), &repository, &image_repository).await;

        assert!(matches!(result, Err(AddEmotionAnimationLayerError::BadRequest(error)) if error.to_lowercase().contains("mouth")));
    }

    #[tokio::test]
    async fn update_emotion_animation_layer_parent_id_does_not_exists_returns_error() {
        let repository = InMemoryEmotionRepository::new();
        let image_repository = InMemoryImageRepository::new();
        let emotion = setup_dummy_emotion(&repository).await;
        setup_base_dummy_images(&image_repository).await;

        let result = update_emotion_animation_layer(create_request(&emotion, |req| {
            req.parent_id = Some(String::from("not existing layer id"));
        }), &repository, &image_repository).await;

        assert!(matches!(result, Err(AddEmotionAnimationLayerError::BadRequest(error)) if error.to_lowercase().contains("parent")));
    }

    #[tokio::test]
    async fn update_emotion_animation_layer_parent_id_exists_save_it() {
        let repository = InMemoryEmotionRepository::new();
        let image_repository = InMemoryImageRepository::new();
        let emotion = setup_dummy_emotion(&repository).await;
        setup_base_dummy_images(&image_repository).await;

        update_emotion_animation_layer(create_request(&emotion, |req| {
            req.id = String::from("an id");
            req.index = 1;
        }), &repository, &image_repository).await.expect("Expected first update not to fail");

        update_emotion_animation_layer(create_request(&emotion, |req| {
            req.id = String::from("an id1");
            req.index = 2;
            req.parent_id = Some(String::from("an id"));
        }), &repository, &image_repository).await.expect("Expected second update not to fail");

        let emotion = get_emotion(GetEmotionRequest { id: emotion.id.0 }, &repository).await.expect("Emotion expected");
        assert_eq!(emotion.animation.len(), 3);
        assert!(matches!(emotion.animation.get(0).unwrap(), EmotionLayerDto::Mouth { .. }));
        assert!(matches!(emotion.animation.get(1).unwrap(), EmotionLayerDto::Animation { .. }));
        assert!(matches!(emotion.animation.get(2).unwrap(), EmotionLayerDto::Animation { .. }));

        if let EmotionLayerDto::Animation { parent_id, .. } = emotion.animation.get(2).unwrap() {
            assert_eq!(parent_id, &Some(String::from("an id")));
        }
    }

    #[tokio::test]
    async fn update_emotion_animation_layer_parent_id_is_mouth_save_it() {
        let repository = InMemoryEmotionRepository::new();
        let image_repository = InMemoryImageRepository::new();
        let emotion = setup_dummy_emotion(&repository).await;
        setup_base_dummy_images(&image_repository).await;

        update_emotion_animation_layer(create_request(&emotion, |req| {
            req.id = String::from("an id");
            req.parent_id = Some(String::from(MOUTH_LAYER_ID));
        }), &repository, &image_repository).await.expect("Expected first update not to fail");

        let emotion = get_emotion(GetEmotionRequest { id: emotion.id.0 }, &repository).await.expect("Emotion expected");
        assert_eq!(emotion.animation.len(), 2);
        assert!(matches!(emotion.animation.get(0).unwrap(), EmotionLayerDto::Mouth { .. }));
        assert!(matches!(emotion.animation.get(1).unwrap(), EmotionLayerDto::Animation { .. }));

        if let EmotionLayerDto::Animation { parent_id, .. } = emotion.animation.get(1).unwrap() {
            assert_eq!(parent_id, &Some(String::from(MOUTH_LAYER_ID)));
        }
    }

    #[tokio::test]
    async fn update_emotion_animation_layer_parent_id_is_itself_returns_error() {
        let repository = InMemoryEmotionRepository::new();
        let image_repository = InMemoryImageRepository::new();
        let emotion = setup_dummy_emotion(&repository).await;
        setup_base_dummy_images(&image_repository).await;

        update_emotion_animation_layer(create_request(&emotion, |req| {
            req.id = String::from("an id");
        }), &repository, &image_repository).await.expect("Expected first update not to fail");

        let result = update_emotion_animation_layer(create_request(&emotion, |req| {
            req.id = String::from("an id");
            req.parent_id = Some(String::from("an id"));
        }), &repository, &image_repository).await;

        assert!(matches!(&result, Err(AddEmotionAnimationLayerError::BadRequest(error)) if error.to_lowercase().contains("parent")));
    }

    #[tokio::test]
    async fn update_emotion_animation_layer_image_not_existing_returns_error() {
        let repository = InMemoryEmotionRepository::new();
        let image_repository = InMemoryImageRepository::new();
        let emotion = setup_dummy_emotion(&repository).await;
        setup_base_dummy_images(&image_repository).await;

        let result = update_emotion_animation_layer(create_request(&emotion, |req| {
            req.animation = vec![
                AnimationFrameDto { frame_start: 0, frame_end: 10, image_id: String::from("id4") },
                AnimationFrameDto { frame_start: 11, frame_end: 20, image_id: String::from("id2") }
            ];
        }), &repository, &image_repository).await;

        assert!(matches!(result, Err(AddEmotionAnimationLayerError::BadRequest(_))), "Expected to fail with bad request but was {:?}", result);
    }

    #[tokio::test]
    async fn update_emotion_animation_layer_two_on_incrementing_index_add_both_layers() {
        let repository = InMemoryEmotionRepository::new();
        let image_repository = InMemoryImageRepository::new();
        let emotion = setup_dummy_emotion(&repository).await;
        setup_base_dummy_images(&image_repository).await;

        update_emotion_animation_layer(create_request(&emotion, |req| {
            req.index = 1;
            req.id = String::from("an id");
            req.animation = vec![
                AnimationFrameDto { frame_start: 0, frame_end: 10, image_id: String::from("id1") },
                AnimationFrameDto { frame_start: 11, frame_end: 20, image_id: String::from("id2") }
            ];
        }), &repository, &image_repository).await.expect("Expected first update emotion not to fail");

        update_emotion_animation_layer(create_request(&emotion, |req| {
            req.index = 2;
            req.id = String::from("an id2");
            req.animation = vec![
                AnimationFrameDto { frame_start: 0, frame_end: 10, image_id: String::from("id2") }
            ];
        }), &repository, &image_repository).await.expect("Expected second update emotion not to fail");

        let emotion = get_emotion(GetEmotionRequest { id: emotion.id.0 }, &repository).await.expect("Expected emotion");
        assert_eq!(emotion.animation.len(), 3);
        assert!(matches!(emotion.animation.get(0).unwrap(), EmotionLayerDto::Mouth { .. }));
        assert!(matches!(emotion.animation.get(1).unwrap(), EmotionLayerDto::Animation { .. }));
        assert!(matches!(emotion.animation.get(2).unwrap(), EmotionLayerDto::Animation { .. }));

        if let EmotionLayerDto::Animation { animation: layer, .. } = emotion.animation.get(1).unwrap() {
            assert_eq!(layer.len(), 2);
            assert_eq!(layer.get(0).unwrap().image_id, "id1");
            assert_eq!(layer.get(0).unwrap().frame_start, 0);
            assert_eq!(layer.get(0).unwrap().frame_end, 10);

            assert_eq!(layer.get(1).unwrap().image_id, "id2");
            assert_eq!(layer.get(1).unwrap().frame_start, 11);
            assert_eq!(layer.get(1).unwrap().frame_end, 20);
        }

        if let EmotionLayerDto::Animation { animation: layer, .. } = emotion.animation.get(2).unwrap() {
            assert_eq!(layer.len(), 1);
            assert_eq!(layer.get(0).unwrap().image_id, "id2");
            assert_eq!(layer.get(0).unwrap().frame_start, 0);
            assert_eq!(layer.get(0).unwrap().frame_end, 10);
        }
    }

    #[tokio::test]
    async fn update_emotion_animation_layer_with_mouth_layer_index_error() {
        let repository = InMemoryEmotionRepository::new();
        let image_repository = InMemoryImageRepository::new();
        let emotion = setup_dummy_emotion(&repository).await;
        setup_base_dummy_images(&image_repository).await;

        let result = update_emotion_animation_layer(create_request(&emotion, |req| {
            req.index = 0;
        }), &repository, &image_repository).await;

        assert!(matches!(result, Err(AddEmotionAnimationLayerError::BadRequest(_))), "Expected to fail with bad request but was {:?}", result);
    }

    #[tokio::test]
    async fn update_emotion_animation_layer_with_out_of_bounds_index_returns_error() {
        let repository = InMemoryEmotionRepository::new();
        let image_repository = InMemoryImageRepository::new();
        let emotion = setup_dummy_emotion(&repository).await;
        setup_base_dummy_images(&image_repository).await;

        let result = update_emotion_animation_layer(create_request(&emotion, |req| {
            req.index = 2;
        }), &repository, &image_repository).await;

        assert!(matches!(result, Err(AddEmotionAnimationLayerError::BadRequest(_))), "Expected to fail with bad request but was {:?}", result);
    }

    #[tokio::test]
    async fn update_emotion_animation_layer_with_existing_custom_layer_index_then_replace_layer() {
        let repository = InMemoryEmotionRepository::new();
        let image_repository = InMemoryImageRepository::new();
        let emotion = setup_dummy_emotion(&repository).await;
        setup_base_dummy_images(&image_repository).await;

        update_emotion_animation_layer(create_request(&emotion, |req| {
            req.index = 1;
            req.id = String::from("an id");
        }), &repository, &image_repository).await.expect("Expected update not to fail");

        update_emotion_animation_layer(create_request(&emotion, |req| {
            req.index = 1;
            req.id = String::from("an id");
            req.animation = vec![
                AnimationFrameDto { frame_start: 5, frame_end: 11, image_id: String::from("id2") },
                AnimationFrameDto { frame_start: 12, frame_end: 23, image_id: String::from("id1") }
            ]
        }), &repository, &image_repository).await.expect("Expected update not to fail");

        let emotion = get_emotion(GetEmotionRequest { id: emotion.id.0 }, &repository).await.expect("Expected emotion");
        assert_eq!(emotion.animation.len(), 2);
        assert!(matches!(emotion.animation.get(0).unwrap(), EmotionLayerDto::Mouth { .. }));
        assert!(matches!(emotion.animation.get(1).unwrap(), EmotionLayerDto::Animation { .. }));

        if let EmotionLayerDto::Animation { id, animation: layer, parent_id, .. } = emotion.animation.get(1).unwrap() {
            assert_eq!(id, "an id");
            assert_eq!(parent_id, &None);
            assert_eq!(layer.len(), 2);
            assert_eq!(layer.get(0).unwrap().image_id, "id2");
            assert_eq!(layer.get(0).unwrap().frame_start, 5);
            assert_eq!(layer.get(0).unwrap().frame_end, 11);

            assert_eq!(layer.get(1).unwrap().image_id, "id1");
            assert_eq!(layer.get(1).unwrap().frame_start, 12);
            assert_eq!(layer.get(1).unwrap().frame_end, 23);
        }
    }

    async fn setup_base_dummy_images(repository: &dyn ImageRepository) {
        setup_dummy_images(vec!["id1", "id2"], repository).await;
    }

    fn create_request<F>(emotion: &Emotion, configure: F) -> AddEmotionAnimationLayerRequest where F: FnOnce(&mut AddEmotionAnimationLayerRequest) -> () {
        let mut req = AddEmotionAnimationLayerRequest {
            index: 1,
            emotion_id: emotion.id.0.clone(),
            id: String::from("an id"),
            parent_id: None,
            translations: None,
            animation: vec![
                AnimationFrameDto { frame_start: 0, frame_end: 10, image_id: String::from("id1") },
                AnimationFrameDto { frame_start: 11, frame_end: 20, image_id: String::from("id2") }
            ]
        };
        configure(&mut req);

        req
    }
}
