use std::collections::HashMap;
use std::sync::Arc;
use pran_droid_core::application::emotions::create::{create_emotion, CreateEmotionRequest};
use pran_droid_core::application::emotions::get::{get_emotion, GetEmotionRequest};
use pran_droid_core::application::emotions::get_by_name::{get_emotion_by_name, GetEmotionByNameRequest};
use pran_droid_core::application::emotions::update_layer::{AddEmotionAnimationLayerRequest, update_emotion_animation_layer};
use pran_droid_core::application::emotions::update_mouth_mapping::{update_emotion_mouth_mapping, UpdateEmotionMouthMappingElementRequest, UpdateEmotionMouthMappingRequest};
use pran_droid_core::application::images::create::{create_image, CreateImageRequest};
use pran_droid_core::application::reactions::create::{create_reaction, CreateReactionRequest};
use pran_droid_core::application::reactions::dtos::reaction_step_dto::{AnimationFrameDto, ReactionStepSkipDto};
use pran_droid_core::application::reactions::insert_movement_step::{insert_movement_step_to_reaction, InsertMovementStepToReactionRequest};
use pran_droid_core::application::reactions::insert_talking_step::{insert_talking_step_to_reaction, InsertTalkingStepToReactionRequest};
use pran_droid_core::domain::emotions::emotion::{Emotion, EmotionId, EmotionLayer, EmotionName};
use pran_droid_core::domain::emotions::emotion_repository::EmotionRepository;
use pran_droid_core::domain::images::image_repository::ImageRepository;
use pran_droid_core::domain::images::image_storage::ImageStorage;
use pran_droid_core::domain::reactions::reaction_repository::ReactionRepository;
use pran_droid_core::persistence::emotions::in_memory_emotion_repository::InMemoryEmotionRepository;
use pran_droid_core::persistence::images::in_memory_image_repository::InMemoryImageRepository;
use pran_droid_core::persistence::images::in_memory_image_storage::InMemoryImageStorage;

pub fn build_test_database(reaction_repository: Arc<dyn ReactionRepository>) {
    let image_repository: Arc<dyn ImageRepository> = Arc::new(InMemoryImageRepository::new());
    let emotion_repository: Arc<dyn EmotionRepository> = Arc::new(InMemoryEmotionRepository::new());
    build_images_database(&image_repository);
    build_emotions_database(&emotion_repository, &image_repository);
    build_reactions_database(&reaction_repository, &image_repository, &emotion_repository);
}

fn build_emotions_database(emotion_repository: &Arc<dyn EmotionRepository>, image_repository: &Arc<dyn ImageRepository>) {
    emotion_repository.insert(&Emotion {
        id: EmotionId(String::from("happy")),
        name: EmotionName(String::from("happy")),
        animation: vec![EmotionLayer::Mouth],
        mouth_mapping: HashMap::new()
    }).expect("error creating emotion");
    emotion_repository.insert(&Emotion {
        id: EmotionId(String::from("sad")),
        name: EmotionName(String::from("sad")),
        animation: vec![EmotionLayer::Mouth],
        mouth_mapping: HashMap::new()
    }).expect("error creating emotion");
    let happy_emotion = get_emotion(GetEmotionRequest { id: String::from("happy") }, emotion_repository).expect("error getting emotion");
    let sad_emotion = get_emotion(GetEmotionRequest { id: String::from("sad") }, emotion_repository).expect("error getting emotion");

    // Mouth mapping
    update_emotion_mouth_mapping(UpdateEmotionMouthMappingRequest {
        emotion_id: happy_emotion.id.clone(),
        mapping: vec! {
            UpdateEmotionMouthMappingElementRequest { name: String::from("aah"), image_id: String::from("eyesFire0") },
            UpdateEmotionMouthMappingElementRequest { name: String::from("o"), image_id: String::from("eyesFire1") }
        },
    }, emotion_repository, image_repository).expect("error updating mouth mapping");

    update_emotion_mouth_mapping(UpdateEmotionMouthMappingRequest {
        emotion_id: sad_emotion.id.clone(),
        mapping: vec! {
            UpdateEmotionMouthMappingElementRequest { name: String::from("aah"), image_id: String::from("pause") },
            UpdateEmotionMouthMappingElementRequest { name: String::from("o"), image_id: String::from("smile") }
        },
    }, emotion_repository, image_repository).expect("error updating mouth mapping");

    // Animation layer for Happy
    update_emotion_animation_layer(AddEmotionAnimationLayerRequest {
        emotion_id: happy_emotion.id.clone(),
        animation: vec![
            AnimationFrameDto { frame_start: 0, frame_end: 10, image_id: String::from("eyesFire2") },
            AnimationFrameDto { frame_start: 15, frame_end: 20, image_id: String::from("eyesFire3") }
        ],
        index: 1
    }, emotion_repository, image_repository).expect("error updating animation layer");

    update_emotion_animation_layer(AddEmotionAnimationLayerRequest {
        emotion_id: happy_emotion.id.clone(),
        animation: vec![
            AnimationFrameDto { frame_start: 0, frame_end: 10, image_id: String::from("pause") },
            AnimationFrameDto { frame_start: 20, frame_end: 25, image_id: String::from("pause") }
        ],
        index: 2
    }, emotion_repository, image_repository).expect("error updating animation layer");

    // Animation layer for Sad
    update_emotion_animation_layer(AddEmotionAnimationLayerRequest {
        emotion_id: sad_emotion.id.clone(),
        animation: vec![
            AnimationFrameDto { frame_start: 0, frame_end: 5, image_id: String::from("eyesFire2") },
            AnimationFrameDto { frame_start: 10, frame_end: 20, image_id: String::from("eyesFire3") }
        ],
        index: 1
    }, emotion_repository, image_repository).expect("error updating animation layer");

    update_emotion_animation_layer(AddEmotionAnimationLayerRequest {
        emotion_id: sad_emotion.id.clone(),
        animation: vec![
            AnimationFrameDto { frame_start: 0, frame_end: 5, image_id: String::from("smile") },
            AnimationFrameDto { frame_start: 15, frame_end: 25, image_id: String::from("smile") }
        ],
        index: 2
    }, emotion_repository, image_repository).expect("error updating animation layer");
}

fn build_images_database(image_repository: &Arc<dyn ImageRepository>) {
    let image_storage: Arc<dyn ImageStorage> = Arc::new(InMemoryImageStorage::new());

    create_image(CreateImageRequest { image: vec![1], id: String::from("pause") }, &image_repository, &image_storage).expect("error creating image");
    create_image(CreateImageRequest { image: vec![1], id: String::from("smile") }, &image_repository, &image_storage).expect("error creating image");
    create_image(CreateImageRequest { image: vec![1], id: String::from("eyesFire0") }, &image_repository, &image_storage).expect("error creating image");
    create_image(CreateImageRequest { image: vec![1], id: String::from("eyesFire1") }, &image_repository, &image_storage).expect("error creating image");
    create_image(CreateImageRequest { image: vec![1], id: String::from("eyesFire2") }, &image_repository, &image_storage).expect("error creating image");
    create_image(CreateImageRequest { image: vec![1], id: String::from("eyesFire3") }, &image_repository, &image_storage).expect("error creating image");
    create_image(CreateImageRequest { image: vec![1], id: String::from("eyesFire4") }, &image_repository, &image_storage).expect("error creating image");
    create_image(CreateImageRequest { image: vec![1], id: String::from("eyesFire5") }, &image_repository, &image_storage).expect("error creating image");
    create_image(CreateImageRequest { image: vec![1], id: String::from("eyesFire6") }, &image_repository, &image_storage).expect("error creating image");
}

fn build_reactions_database(reaction_repository: &Arc<dyn ReactionRepository>, image_repository: &Arc<dyn ImageRepository>, emotion_repository: &Arc<dyn EmotionRepository>) {
    let reaction1 = create_reaction(CreateReactionRequest { trigger: String::from("!hello") }, &reaction_repository).expect("error creating reaction");
    let reaction2 = create_reaction(CreateReactionRequest { trigger: String::from("!move") }, &reaction_repository).expect("error creating reaction");
    let sad_emotion = get_emotion_by_name(GetEmotionByNameRequest { name: String::from("sad") }, &emotion_repository).expect("error getting sad emotion");
    let happy_emotion = get_emotion_by_name(GetEmotionByNameRequest { name: String::from("happy") }, &emotion_repository).expect("error getting happy emotion");

    insert_movement_step_to_reaction(InsertMovementStepToReactionRequest {
        animation: vec![
            AnimationFrameDto { image_id: String::from("eyesFire0"), frame_start: 0, frame_end: 4 },
            AnimationFrameDto { image_id: String::from("eyesFire1"), frame_start: 5, frame_end: 9 },
            AnimationFrameDto { image_id: String::from("eyesFire2"), frame_start: 10, frame_end: 14 },
            AnimationFrameDto { image_id: String::from("eyesFire3"), frame_start: 15, frame_end: 19 },
            AnimationFrameDto { image_id: String::from("eyesFire4"), frame_start: 20, frame_end: 24 },
            AnimationFrameDto { image_id: String::from("eyesFire5"), frame_start: 25, frame_end: 29 },
            AnimationFrameDto { image_id: String::from("eyesFire6"), frame_start: 30, frame_end: 34 },
        ],
        skip: ReactionStepSkipDto::ImmediatelyAfter,
        step_index: 0,
        reaction_id: reaction1.id.clone(),
    }, &reaction_repository, &image_repository).expect("error inserting step");

    insert_movement_step_to_reaction(InsertMovementStepToReactionRequest {
        animation: vec![
            AnimationFrameDto { image_id: String::from("eyesFire0"), frame_start: 0, frame_end: 4 },
            AnimationFrameDto { image_id: String::from("eyesFire1"), frame_start: 5, frame_end: 9 },
            AnimationFrameDto { image_id: String::from("eyesFire2"), frame_start: 10, frame_end: 14 },
            AnimationFrameDto { image_id: String::from("eyesFire3"), frame_start: 15, frame_end: 19 },
            AnimationFrameDto { image_id: String::from("eyesFire4"), frame_start: 20, frame_end: 24 },
            AnimationFrameDto { image_id: String::from("eyesFire5"), frame_start: 25, frame_end: 29 },
            AnimationFrameDto { image_id: String::from("eyesFire6"), frame_start: 30, frame_end: 34 },
        ],
        skip: ReactionStepSkipDto::AfterMilliseconds(500),
        step_index: 1,
        reaction_id: reaction1.id.clone(),
    }, &reaction_repository, &image_repository).expect("error inserting step");

    insert_talking_step_to_reaction(InsertTalkingStepToReactionRequest {
        emotion_id: sad_emotion.id.clone(),
        text: String::from("Hey everyone, a bit sad..."),
        skip: ReactionStepSkipDto::AfterMilliseconds(500),
        step_index: 2,
        reaction_id: reaction1.id.clone(),
    }, &reaction_repository, &emotion_repository).expect("error inserting step");

    insert_talking_step_to_reaction(InsertTalkingStepToReactionRequest {
        emotion_id: sad_emotion.id.clone(),
        text: String::from("...but prandroid here!"),
        skip: ReactionStepSkipDto::AfterMilliseconds(500),
        step_index: 3,
        reaction_id: reaction1.id.clone(),
    }, &reaction_repository, &emotion_repository).expect("error inserting step");

    insert_movement_step_to_reaction(InsertMovementStepToReactionRequest {
        animation: vec![AnimationFrameDto {
            image_id: String::from("pause"),
            frame_start: 0,
            frame_end: 10,
        }, AnimationFrameDto {
            image_id: String::from("pause"),
            frame_start: 11,
            frame_end: 25,
        }],
        skip: ReactionStepSkipDto::ImmediatelyAfter,
        step_index: 0,
        reaction_id: reaction2.id.clone(),
    }, &reaction_repository, &image_repository).expect("error inserting step");

    insert_movement_step_to_reaction(InsertMovementStepToReactionRequest {
        animation: vec![AnimationFrameDto {
            image_id: String::from("pause"),
            frame_start: 0,
            frame_end: 10,
        }, AnimationFrameDto {
            image_id: String::from("pause"),
            frame_start: 11,
            frame_end: 25,
        }],
        skip: ReactionStepSkipDto::ImmediatelyAfter,
        step_index: 1,
        reaction_id: reaction2.id.clone(),
    }, &reaction_repository, &image_repository).expect("error inserting step");

    insert_talking_step_to_reaction(InsertTalkingStepToReactionRequest {
        emotion_id: happy_emotion.id.clone(),
        text: String::from("Hey everyone, prandroid here!"),
        skip: ReactionStepSkipDto::AfterMilliseconds(500),
        step_index: 2,
        reaction_id: reaction2.id.clone(),
    }, &reaction_repository, &emotion_repository).expect("error inserting step");
}