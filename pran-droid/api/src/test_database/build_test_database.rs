use std::fs;
use std::path::Path;
use pran_droid_core::application::emotions::create::{create_emotion, CreateEmotionRequest};
use pran_droid_core::application::emotions::get_by_name::{get_emotion_by_name, GetEmotionByNameRequest};
use pran_droid_core::application::emotions::update_layer::{AddEmotionAnimationLayerRequest, update_emotion_animation_layer};
use pran_droid_core::application::emotions::update_mouth_layer::{update_emotion_mouth_layer, UpdateEmotionMouthMappingElementRequest, UpdateEmotionMouthLayerRequest};
use pran_droid_core::application::images::create::{create_image, CreateImageRequest};
use pran_droid_core::application::reactions::create::{create_reaction, CreateReactionRequest};
use pran_droid_core::application::reactions::dtos::reaction_dto::ReactionTriggerDto;
use pran_droid_core::application::reactions::dtos::reaction_step_dto::{AnimationFrameDto, ReactionStepSkipDto, ReactionStepTextAlternativeDto, ReactionStepTextDto};
use pran_droid_core::application::reactions::insert_talking_step::{insert_talking_step_to_reaction, InsertTalkingStepToReactionRequest};
use pran_droid_core::application::reactions::update::{update_reaction, UpdateReactionRequest};
use pran_droid_core::domain::emotions::emotion::{MouthPositionName};
use pran_droid_core::domain::emotions::emotion_repository::EmotionRepository;
use pran_droid_core::domain::images::image_repository::ImageRepository;
use pran_droid_core::domain::images::image_storage::ImageStorage;
use pran_droid_core::domain::reactions::reaction_definition_repository::ReactionDefinitionRepository;

pub async fn build_test_database(reaction_repository: &dyn ReactionDefinitionRepository, emotion_repository: &dyn EmotionRepository, image_repository: &dyn ImageRepository, image_storage: &dyn ImageStorage) {
    build_images_database(image_repository, image_storage).await;
    build_emotions_database(emotion_repository, image_repository).await;
    build_reactions_database(reaction_repository, emotion_repository).await;
}

async fn build_emotions_database(emotion_repository: &dyn EmotionRepository, image_repository: &dyn ImageRepository) {
    let happy_emotion = create_emotion(CreateEmotionRequest { name: String::from("happy") }, emotion_repository).await.expect("error creating emotion");

    update_emotion_animation_layer(AddEmotionAnimationLayerRequest {
        emotion_id: happy_emotion.id.clone(),
        id: String::from("head"),
        parent_id: None,
        translations: None,
        animation: vec![
            AnimationFrameDto { frame_start: 0, frame_end: 10, image_id: String::from("idle") },
        ],
        index: 1,
    }, emotion_repository, image_repository).await.expect("error updating animation layer");

    update_emotion_animation_layer(AddEmotionAnimationLayerRequest {
        emotion_id: happy_emotion.id.clone(),
        id: String::from("eyes"),
        parent_id: Some(String::from("head")),
        translations: None,
        animation: vec![
            AnimationFrameDto { frame_start: 0, frame_end: 200, image_id: String::from("eyes0") },
            AnimationFrameDto { frame_start: 201, frame_end: 204, image_id: String::from("eyes1") },
            AnimationFrameDto { frame_start: 205, frame_end: 208, image_id: String::from("eyes2") },
            AnimationFrameDto { frame_start: 209, frame_end: 212, image_id: String::from("eyes1") },
        ],
        index: 2,
    }, emotion_repository, image_repository).await.expect("error updating animation layer");

    // Mouth mapping
    update_emotion_mouth_layer(UpdateEmotionMouthLayerRequest {
        emotion_id: happy_emotion.id.clone(),
        parent_id: Some(String::from("head")),
        translations: None,
        mapping: vec! {
            UpdateEmotionMouthMappingElementRequest { name: MouthPositionName::Ah.into(), image_id: String::from("happyAh") },
            UpdateEmotionMouthMappingElementRequest { name: MouthPositionName::B.into(), image_id: String::from("happyB") },
            UpdateEmotionMouthMappingElementRequest { name: MouthPositionName::Ee.into(), image_id: String::from("happyEe") },
            UpdateEmotionMouthMappingElementRequest { name: MouthPositionName::FV.into(), image_id: String::from("happyFV") },
            UpdateEmotionMouthMappingElementRequest { name: MouthPositionName::K.into(), image_id: String::from("happyK") },
            UpdateEmotionMouthMappingElementRequest { name: MouthPositionName::L.into(), image_id: String::from("happyL") },
            UpdateEmotionMouthMappingElementRequest { name: MouthPositionName::Oh.into(), image_id: String::from("happyOh") },
            UpdateEmotionMouthMappingElementRequest { name: MouthPositionName::P1.into(), image_id: String::from("happyP1") },
            UpdateEmotionMouthMappingElementRequest { name: MouthPositionName::P2.into(), image_id: String::from("happyP2") },
            UpdateEmotionMouthMappingElementRequest { name: MouthPositionName::S.into(), image_id: String::from("happyS") },
            UpdateEmotionMouthMappingElementRequest { name: MouthPositionName::Ur.into(), image_id: String::from("happyUr") },
            UpdateEmotionMouthMappingElementRequest { name: MouthPositionName::Idle.into(), image_id: String::from("happyIdle") },
        },
    }, emotion_repository, image_repository).await.expect("error updating mouth mapping");
}

async fn build_images_database(image_repository: &dyn ImageRepository, image_storage: &dyn ImageStorage) {
    // Happy mouth
    create_image(CreateImageRequest { image: fetch_image("mouth/ah.png"), id: String::from("happyAh") }, image_repository, image_storage).await.expect("error creating image");
    create_image(CreateImageRequest { image: fetch_image("mouth/b.png"), id: String::from("happyB") }, image_repository, image_storage).await.expect("error creating image");
    create_image(CreateImageRequest { image: fetch_image("mouth/ee.png"), id: String::from("happyEe") }, image_repository, image_storage).await.expect("error creating image");
    create_image(CreateImageRequest { image: fetch_image("mouth/fv.png"), id: String::from("happyFV") }, image_repository, image_storage).await.expect("error creating image");
    create_image(CreateImageRequest { image: fetch_image("mouth/k.png"), id: String::from("happyK") }, image_repository, image_storage).await.expect("error creating image");
    create_image(CreateImageRequest { image: fetch_image("mouth/l.png"), id: String::from("happyL") }, image_repository, image_storage).await.expect("error creating image");
    create_image(CreateImageRequest { image: fetch_image("mouth/oh.png"), id: String::from("happyOh") }, image_repository, image_storage).await.expect("error creating image");
    create_image(CreateImageRequest { image: fetch_image("mouth/p1.png"), id: String::from("happyP1") }, image_repository, image_storage).await.expect("error creating image");
    create_image(CreateImageRequest { image: fetch_image("mouth/p2.png"), id: String::from("happyP2") }, image_repository, image_storage).await.expect("error creating image");
    create_image(CreateImageRequest { image: fetch_image("mouth/s.png"), id: String::from("happyS") }, image_repository, image_storage).await.expect("error creating image");
    create_image(CreateImageRequest { image: fetch_image("mouth/ur.png"), id: String::from("happyUr") }, image_repository, image_storage).await.expect("error creating image");
    create_image(CreateImageRequest { image: fetch_image("mouth/smile.png"), id: String::from("happyIdle") }, image_repository, image_storage).await.expect("error creating image");

    create_image(CreateImageRequest { image: fetch_image("idle_0000.png"), id: String::from("idle") }, image_repository, image_storage).await.expect("error creating image");

    create_image(CreateImageRequest { image: fetch_image("eyes/eyes_0000.png"), id: String::from("eyes0") }, image_repository, image_storage).await.expect("error creating image");
    create_image(CreateImageRequest { image: fetch_image("eyes/eyes_0001.png"), id: String::from("eyes1") }, image_repository, image_storage).await.expect("error creating image");
    create_image(CreateImageRequest { image: fetch_image("eyes/eyes_0002.png"), id: String::from("eyes2") }, image_repository, image_storage).await.expect("error creating image");

    create_image(CreateImageRequest { image: fetch_image("eyes/eyesFire_0000.png"), id: String::from("eyesFire0") }, image_repository, image_storage).await.expect("error creating image");
    create_image(CreateImageRequest { image: fetch_image("eyes/eyesFire_0001.png"), id: String::from("eyesFire1") }, image_repository, image_storage).await.expect("error creating image");
    create_image(CreateImageRequest { image: fetch_image("eyes/eyesFire_0002.png"), id: String::from("eyesFire2") }, image_repository, image_storage).await.expect("error creating image");
    create_image(CreateImageRequest { image: fetch_image("eyes/eyesFire_0003.png"), id: String::from("eyesFire3") }, image_repository, image_storage).await.expect("error creating image");
    create_image(CreateImageRequest { image: fetch_image("eyes/eyesFire_0004.png"), id: String::from("eyesFire4") }, image_repository, image_storage).await.expect("error creating image");
    create_image(CreateImageRequest { image: fetch_image("eyes/eyesFire_0005.png"), id: String::from("eyesFire5") }, image_repository, image_storage).await.expect("error creating image");
    create_image(CreateImageRequest { image: fetch_image("eyes/eyesFire_0006.png"), id: String::from("eyesFire6") }, image_repository, image_storage).await.expect("error creating image");
}

async fn build_reactions_database(reaction_repository: &dyn ReactionDefinitionRepository, emotion_repository: &dyn EmotionRepository) {
    let happy_emotion = get_emotion_by_name(GetEmotionByNameRequest { name: String::from("happy") }, emotion_repository).await.expect("error getting happy emotion");

    // !hi
    {
        let reaction = create_reaction(CreateReactionRequest {
            trigger: ReactionTriggerDto::ChatCommand(String::from("!hi"))
        }, reaction_repository).await.expect("error creating reaction");
        update_reaction(UpdateReactionRequest {
            id: reaction.id.clone(),
            count: None,
            triggers: Some(vec![ReactionTriggerDto::ChatCommand(String::from("!hi")), ReactionTriggerDto::ChatCommand(String::from("!hello"))]),
            is_disabled: None,
        }, reaction_repository).await.expect("error updating reaction");
        insert_talking_step_to_reaction(InsertTalkingStepToReactionRequest {
            emotion_id: happy_emotion.id.clone(),
            // Random, ask pranessa
            alternatives: vec![ReactionStepTextAlternativeDto { text: ReactionStepTextDto::Instant(String::from("Hi ${user}!!")), probability: Some(100.0) }],
            skip: ReactionStepSkipDto::AfterStepWithExtraMilliseconds(3000),
            // Cooldown 10 seconds
            // Authorisation level Everyone
            step_index: 0,
            reaction_id: reaction.id.clone(),
        }, reaction_repository, emotion_repository).await.expect("error inserting step");
    }

    // !beep
    {
        let reaction = create_reaction(CreateReactionRequest {
            trigger: ReactionTriggerDto::ChatCommand(String::from("!beep"))
        }, reaction_repository).await.expect("error creating reaction");
        insert_talking_step_to_reaction(InsertTalkingStepToReactionRequest {
            emotion_id: happy_emotion.id.clone(),
            alternatives: vec![
                ReactionStepTextAlternativeDto { text: ReactionStepTextDto::Instant(String::from("Beep boob boop")), probability: Some(20.0) },
                ReactionStepTextAlternativeDto { text: ReactionStepTextDto::Instant(String::from("Bo-beep")), probability: Some(20.0) },
                ReactionStepTextAlternativeDto { text: ReactionStepTextDto::Instant(String::from("Beeeeeeeee")), probability: Some(20.0) },
                ReactionStepTextAlternativeDto { text: ReactionStepTextDto::Instant(String::from("Boop boop")), probability: Some(20.0) },
                ReactionStepTextAlternativeDto { text: ReactionStepTextDto::Instant(String::from("Beep")), probability: Some(20.0) },
            ],
            skip: ReactionStepSkipDto::AfterStepWithExtraMilliseconds(3000),
            // Cooldown 5 seconds
            // Authorisation level Everyone
            step_index: 0,
            reaction_id: reaction.id.clone(),
        }, reaction_repository, emotion_repository).await.expect("error inserting step");
    }

    // !lurk
    {
        let reaction = create_reaction(CreateReactionRequest {
            trigger: ReactionTriggerDto::ChatCommand(String::from("!lurk"))
        }, reaction_repository).await.expect("error creating reaction");
        insert_talking_step_to_reaction(InsertTalkingStepToReactionRequest {
            emotion_id: happy_emotion.id.clone(),
            alternatives: vec![ReactionStepTextAlternativeDto { text: ReactionStepTextDto::Instant(String::from("Enjoy the lurk ${user}")), probability: Some(100.0) }],
            skip: ReactionStepSkipDto::AfterStepWithExtraMilliseconds(3000),
            // Cooldown 5 seconds
            // Authorisation level Everyone
            step_index: 0,
            reaction_id: reaction.id.clone(),
        }, reaction_repository, emotion_repository).await.expect("error inserting step");
    }

    // !chaos
    {
        let reaction = create_reaction(CreateReactionRequest {
            trigger: ReactionTriggerDto::ChatCommand(String::from("!chaos"))
        }, reaction_repository).await.expect("error creating reaction");
        insert_talking_step_to_reaction(InsertTalkingStepToReactionRequest {
            emotion_id: happy_emotion.id.clone(),
            // Random, ask pranessa
            alternatives: vec![ReactionStepTextAlternativeDto { text: ReactionStepTextDto::Instant(String::from("AI doesn’t have to be evil to destroy humanity – if AI has a goal and humanity just happens to come in the way, it will destroy humanity as a matter of course without even thinking about it, no hard feelings.")), probability: Some(100.0) }],
            skip: ReactionStepSkipDto::AfterStepWithExtraMilliseconds(3000),
            // Cooldown 5 seconds
            // Authorisation level Everyone
            step_index: 0,
            reaction_id: reaction.id.clone(),
        }, reaction_repository, emotion_repository).await.expect("error inserting step");
    }

    // !hydrate - MAKE REDEEM OF HYDRATE
    {
        let reaction = create_reaction(CreateReactionRequest {
            trigger: ReactionTriggerDto::ChatCommand(String::from("!hydrate"))
        }, reaction_repository).await.expect("error creating reaction");
        insert_talking_step_to_reaction(InsertTalkingStepToReactionRequest {
            emotion_id: happy_emotion.id.clone(),
            // Random, ask pranessa
            alternatives: vec![ReactionStepTextAlternativeDto { text: ReactionStepTextDto::Instant(String::from("Go grab a glass of water!")), probability: Some(100.0) }],
            skip: ReactionStepSkipDto::AfterStepWithExtraMilliseconds(3000),
            // Cooldown 5 seconds
            // Authorisation level Everyone
            step_index: 0,
            reaction_id: reaction.id.clone(),
        }, reaction_repository, emotion_repository).await.expect("error inserting step");
    }

    // !kill
    {
        let reaction = create_reaction(CreateReactionRequest {
            trigger: ReactionTriggerDto::ChatCommand(String::from("!kill"))
        }, reaction_repository).await.expect("error creating reaction");
        insert_talking_step_to_reaction(InsertTalkingStepToReactionRequest {
            emotion_id: happy_emotion.id.clone(),
            alternatives: vec![ReactionStepTextAlternativeDto { text: ReactionStepTextDto::Instant(String::from("EXTERMINATE!")), probability: Some(100.0) }],
            skip: ReactionStepSkipDto::AfterStepWithExtraMilliseconds(3000),
            // Cooldown 5 seconds
            // Authorisation level Everyone
            step_index: 0,
            reaction_id: reaction.id.clone(),
        }, reaction_repository, emotion_repository).await.expect("error inserting step");
    }

    // !help
    {
        let reaction = create_reaction(CreateReactionRequest {
            trigger: ReactionTriggerDto::ChatCommand(String::from("!help"))
        }, reaction_repository).await.expect("error creating reaction");
        insert_talking_step_to_reaction(InsertTalkingStepToReactionRequest {
            emotion_id: happy_emotion.id.clone(),
            alternatives: vec![ReactionStepTextAlternativeDto { text: ReactionStepTextDto::Instant(String::from("I'm just a droid, I can't do much")), probability: Some(100.0) }],
            skip: ReactionStepSkipDto::AfterStepWithExtraMilliseconds(3000),
            // Cooldown 5 seconds
            // Authorisation level Everyone
            step_index: 0,
            reaction_id: reaction.id.clone(),
        }, reaction_repository, emotion_repository).await.expect("error inserting step");
    }

    // !aria
    {
        let reaction = create_reaction(CreateReactionRequest {
            trigger: ReactionTriggerDto::ChatCommand(String::from("!aria"))
        }, reaction_repository).await.expect("error creating reaction");
        insert_talking_step_to_reaction(InsertTalkingStepToReactionRequest {
            emotion_id: happy_emotion.id.clone(),
            alternatives: vec![ReactionStepTextAlternativeDto { text: ReactionStepTextDto::Instant(String::from("Do you know Aria? She's a cutie")), probability: Some(100.0) }],
            skip: ReactionStepSkipDto::AfterStepWithExtraMilliseconds(3000),
            // Cooldown 5 seconds
            // Authorisation level Everyone
            step_index: 0,
            reaction_id: reaction.id.clone(),
        }, reaction_repository, emotion_repository).await.expect("error inserting step");
    }

    // !star
    {
        let reaction = create_reaction(CreateReactionRequest {
            trigger: ReactionTriggerDto::ChatCommand(String::from("!star"))
        }, reaction_repository).await.expect("error creating reaction");
        insert_talking_step_to_reaction(InsertTalkingStepToReactionRequest {
            emotion_id: happy_emotion.id.clone(),
            alternatives: vec![ReactionStepTextAlternativeDto { text: ReactionStepTextDto::Instant(String::from("There are ${count} stars in the sky!")), probability: Some(100.0) }],
            skip: ReactionStepSkipDto::AfterStepWithExtraMilliseconds(3000),
            // Cooldown 5 seconds
            // Authorisation level Everyone
            step_index: 0,
            reaction_id: reaction.id.clone(),
        }, reaction_repository, emotion_repository).await.expect("error inserting step");
    }

    // !save
    {
        let reaction = create_reaction(CreateReactionRequest {
            trigger: ReactionTriggerDto::ChatCommand(String::from("!save"))
        }, reaction_repository).await.expect("error creating reaction");
        insert_talking_step_to_reaction(InsertTalkingStepToReactionRequest {
            emotion_id: happy_emotion.id.clone(),
            // Random, ask pranessa
            alternatives: vec![ReactionStepTextAlternativeDto { text: ReactionStepTextDto::Instant(String::from("The sight of such a friendly town fills you with determination.")), probability: Some(100.0) }],
            skip: ReactionStepSkipDto::AfterStepWithExtraMilliseconds(3000),
            // Cooldown 5 seconds
            // Authorisation level Everyone
            step_index: 0,
            reaction_id: reaction.id.clone(),
        }, reaction_repository, emotion_repository).await.expect("error inserting step");
    }

    // !battle
    {
        let reaction = create_reaction(CreateReactionRequest {
            trigger: ReactionTriggerDto::ChatCommand(String::from("!battle"))
        }, reaction_repository).await.expect("error creating reaction");
        insert_talking_step_to_reaction(InsertTalkingStepToReactionRequest {
            emotion_id: happy_emotion.id.clone(),
            // Random, ask pranessa
            alternatives: vec![ReactionStepTextAlternativeDto { text: ReactionStepTextDto::Instant(String::from("[FIGHT]")), probability: Some(100.0) }],
            skip: ReactionStepSkipDto::AfterStepWithExtraMilliseconds(3000),
            // Cooldown 5 seconds
            // Authorisation level Everyone
            step_index: 0,
            reaction_id: reaction.id.clone(),
        }, reaction_repository, emotion_repository).await.expect("error inserting step");
    }

    // !so
    {
        let reaction = create_reaction(CreateReactionRequest {
            trigger: ReactionTriggerDto::ChatCommand(String::from("!so"))
        }, reaction_repository).await.expect("error creating reaction");
        insert_talking_step_to_reaction(InsertTalkingStepToReactionRequest {
            emotion_id: happy_emotion.id.clone(),
            // Random, ask pranessa
            alternatives: vec![ReactionStepTextAlternativeDto { text: ReactionStepTextDto::Instant(String::from("Did you say ${target}?! I've heard amazing things about them!")), probability: Some(100.0) }],
            skip: ReactionStepSkipDto::AfterStepWithExtraMilliseconds(3000),
            // Cooldown 5 seconds
            // Authorisation level Everyone
            step_index: 0,
            reaction_id: reaction.id.clone(),
        }, reaction_repository, emotion_repository).await.expect("error inserting step");
    }

    // !name
    {
        let reaction = create_reaction(CreateReactionRequest {
            trigger: ReactionTriggerDto::ChatCommand(String::from("!name"))
        }, reaction_repository).await.expect("error creating reaction");
        insert_talking_step_to_reaction(InsertTalkingStepToReactionRequest {
            emotion_id: happy_emotion.id.clone(),
            alternatives: vec![ReactionStepTextAlternativeDto { text: ReactionStepTextDto::Instant(String::from("My name, my real name. That is not the point.")), probability: Some(100.0) }],
            skip: ReactionStepSkipDto::AfterStepWithExtraMilliseconds(3000),
            // Cooldown 5 seconds
            // Authorisation level Everyone
            step_index: 0,
            reaction_id: reaction.id.clone(),
        }, reaction_repository, emotion_repository).await.expect("error inserting step");
    }

    // !pat
    {
        let reaction = create_reaction(CreateReactionRequest {
            trigger: ReactionTriggerDto::ChatCommand(String::from("!pat"))
        }, reaction_repository).await.expect("error creating reaction");
        insert_talking_step_to_reaction(InsertTalkingStepToReactionRequest {
            emotion_id: happy_emotion.id.clone(),
            alternatives: vec![ReactionStepTextAlternativeDto { text: ReactionStepTextDto::Instant(String::from("People tell me I'm a heavy patter ${target}")), probability: Some(100.0) }],
            skip: ReactionStepSkipDto::AfterStepWithExtraMilliseconds(3000),
            // Cooldown 5 seconds
            // Authorisation level Everyone
            step_index: 0,
            reaction_id: reaction.id.clone(),
        }, reaction_repository, emotion_repository).await.expect("error inserting step");
    }

    // !breaktime
    {
        let reaction = create_reaction(CreateReactionRequest {
            trigger: ReactionTriggerDto::ChatCommand(String::from("!breaktime"))
        }, reaction_repository).await.expect("error creating reaction");
        insert_talking_step_to_reaction(InsertTalkingStepToReactionRequest {
            emotion_id: happy_emotion.id.clone(),
            alternatives: vec![ReactionStepTextAlternativeDto { text: ReactionStepTextDto::Instant(String::from("Time to break things I guess")), probability: Some(100.0) }],
            skip: ReactionStepSkipDto::AfterStepWithExtraMilliseconds(3000),
            // Cooldown 5 seconds
            // Authorisation level Everyone
            step_index: 0,
            reaction_id: reaction.id.clone(),
        }, reaction_repository, emotion_repository).await.expect("error inserting step");
    }

    // !cookie
    {
        let reaction = create_reaction(CreateReactionRequest {
            trigger: ReactionTriggerDto::ChatCommand(String::from("!cookie"))
        }, reaction_repository).await.expect("error creating reaction");
        insert_talking_step_to_reaction(InsertTalkingStepToReactionRequest {
            emotion_id: happy_emotion.id.clone(),
            // Random, ask pranessa
            alternatives: vec![ReactionStepTextAlternativeDto { text: ReactionStepTextDto::Instant(String::from("A freshly baked cookie for you!")), probability: Some(100.0) }],
            skip: ReactionStepSkipDto::AfterStepWithExtraMilliseconds(3000),
            // Cooldown 5 seconds
            // Authorisation level Everyone
            step_index: 0,
            reaction_id: reaction.id.clone(),
        }, reaction_repository, emotion_repository).await.expect("error inserting step");
    }

    // !croissant
    {
        let reaction = create_reaction(CreateReactionRequest {
            trigger: ReactionTriggerDto::ChatCommand(String::from("!croissant"))
        }, reaction_repository).await.expect("error creating reaction");
        insert_talking_step_to_reaction(InsertTalkingStepToReactionRequest {
            emotion_id: happy_emotion.id.clone(),
            alternatives: vec![ReactionStepTextAlternativeDto { text: ReactionStepTextDto::Instant(String::from("CONGRATULATIONS! You won a life-long subscription to our unlimited croissant stock!")), probability: Some(100.0) }],
            skip: ReactionStepSkipDto::AfterStepWithExtraMilliseconds(3000),
            // Cooldown 5 seconds
            // Authorisation level Everyone
            step_index: 0,
            reaction_id: reaction.id.clone(),
        }, reaction_repository, emotion_repository).await.expect("error inserting step");
    }

    // !mantra
    {
        let reaction = create_reaction(CreateReactionRequest {
            trigger: ReactionTriggerDto::ChatCommand(String::from("!mantra"))
        }, reaction_repository).await.expect("error creating reaction");
        update_reaction(UpdateReactionRequest {
            id: reaction.id.clone(),
            count: None,
            triggers: Some(vec![ReactionTriggerDto::ChatCommand(String::from("!mantra")), ReactionTriggerDto::ChatCommand(String::from("!bs"))]),
            is_disabled: None,
        }, reaction_repository).await.expect("error updating reaction");
        insert_talking_step_to_reaction(InsertTalkingStepToReactionRequest {
            emotion_id: happy_emotion.id.clone(),
            alternatives: vec![ReactionStepTextAlternativeDto { text: ReactionStepTextDto::Instant(String::from("${target} is an incredible artist. You do your best. Your best is enough. People do not hate you.")), probability: Some(100.0) }],
            skip: ReactionStepSkipDto::AfterStepWithExtraMilliseconds(3000),
            // Cooldown 5 seconds
            // Authorisation level Everyone
            step_index: 0,
            reaction_id: reaction.id.clone(),
        }, reaction_repository, emotion_repository).await.expect("error inserting step");
    }

    // pranesIsFine
    {
        let reaction = create_reaction(CreateReactionRequest {
            trigger: ReactionTriggerDto::ChatKeyword(String::from("pranesIsFine"))
        }, reaction_repository).await.expect("error creating reaction");
        insert_talking_step_to_reaction(InsertTalkingStepToReactionRequest {
            emotion_id: happy_emotion.id.clone(),
            alternatives: vec![ReactionStepTextAlternativeDto { text: ReactionStepTextDto::Instant(String::from("This is fine")), probability: Some(100.0) }],
            skip: ReactionStepSkipDto::AfterStepWithExtraMilliseconds(3000),
            // Cooldown 5 seconds
            // Authorisation level Everyone
            step_index: 0,
            reaction_id: reaction.id.clone(),
        }, reaction_repository, emotion_repository).await.expect("error inserting step");
    }
}

fn fetch_image(path: &str) -> Vec<u8> {
    let path = Path::new("../frontend/src/resources/").join(path);
    fs::read(path.clone()).expect(format!("{:?}", path).as_str()).as_slice().to_vec()
}
