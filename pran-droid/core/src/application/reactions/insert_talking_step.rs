use std::fmt::Debug;
use thiserror::Error;
use crate::application::reactions::dtos::reaction_step_dto::{ReactionStepDto, ReactionStepSkipDto, ReactionStepTextAlternativeDto, ReactionStepTextDto};
use crate::domain::emotions::emotion::EmotionId;
use crate::domain::emotions::emotion_repository::EmotionRepository;
use crate::domain::reactions::reaction_definition::{ReactionDefinition, ReactionDefinitionId, ReactionStepMessageAlternativeDefinition, ReactionStepMessageAlternativesDefinition, ReactionStepMessageDefinition, TalkingReactionStepDefinition};
use crate::domain::reactions::reaction_domain_service::{add_talking_step_to_reaction, AddStepToReactionError, replace_talking_step_in_reaction};
use crate::domain::reactions::reaction_definition_repository::ReactionDefinitionRepository;

#[derive(Debug, Error)]
pub enum AddTalkingStepToReactionError {
    #[error("Bad request")]
    BadRequest(String),
    #[error("Wrong emotion details")]
    BadEmotionRequest(#[from] AddStepToReactionError),
}

pub struct InsertTalkingStepToReactionRequest {
    pub reaction_id: String,
    pub step_index: usize,
    pub emotion_id: String,
    pub skip: ReactionStepSkipDto,
    pub alternatives: Vec<ReactionStepTextAlternativeDto>,
}

pub async fn insert_talking_step_to_reaction(request: InsertTalkingStepToReactionRequest, repository: &dyn ReactionDefinitionRepository, emotion_repository: &dyn EmotionRepository) -> Result<ReactionStepDto, AddTalkingStepToReactionError> {
    let mut reaction = repository.get(&ReactionDefinitionId(request.reaction_id.clone())).await
        .ok_or_else(|| AddTalkingStepToReactionError::BadRequest(String::from("The requested reaction id does not exist")))?;

    let reaction_step = TalkingReactionStepDefinition {
        skip: request.skip.into(),
        emotion_id: EmotionId(request.emotion_id),
        alternatives: ReactionStepMessageAlternativesDefinition::try_new(request.alternatives.iter().map(|alternative| ReactionStepMessageAlternativeDefinition {
            message: match &alternative.text {
                ReactionStepTextDto::Instant(text) => ReactionStepMessageDefinition::Instant(text.clone()),
                ReactionStepTextDto::LetterByLetter(text) => ReactionStepMessageDefinition::LetterByLetter(text.clone()),
            },
            probability: alternative.probability
        }).collect()).map_err(|_| AddTalkingStepToReactionError::BadRequest(String::from("The request text does not have 100 probability total")))?
    };
    insert_step_in_correct_index(&mut reaction, reaction_step.clone(), request.step_index, emotion_repository).await?;
    repository.update(&reaction).await.unwrap();

    Ok(reaction_step.into())
}

async fn insert_step_in_correct_index(reaction: &mut ReactionDefinition, reaction_step: TalkingReactionStepDefinition, step_index: usize, emotion_repository: &dyn EmotionRepository) -> Result<(), AddTalkingStepToReactionError> {
    if step_index > reaction.steps.len() {
        return Err(AddTalkingStepToReactionError::BadRequest(String::from("Index out of bounds")));
    } else if step_index == reaction.steps.len() {
        add_talking_step_to_reaction(reaction, reaction_step, emotion_repository).await?;
    } else {
        replace_talking_step_in_reaction(reaction, reaction_step, step_index, emotion_repository).await?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::application::reactions::get::{get_reaction, GetReactionRequest};
    use crate::persistence::reactions::in_memory_reaction_repository::InMemoryReactionRepository;
    use crate::application::reactions::dtos::reaction_step_dto::{ReactionStepSkipDto, ReactionStepTextDto, TalkingReactionStepDto};
    use crate::domain::emotions::emotion_repository::tests::setup_dummy_emotions;
    use crate::domain::reactions::reaction_definition_repository::tests::setup_dummy_chat_command_reaction_definition;
    use crate::persistence::emotions::in_memory_emotion_repository::InMemoryEmotionRepository;

    #[tokio::test]
    async fn insert_talking_step_to_reaction_wrong_id_return_error() {
        let repository = InMemoryReactionRepository::new();
        let emotion_repo = InMemoryEmotionRepository::new();
        setup_dummy_chat_command_reaction_definition(&repository).await;
        setup_dummy_emotions(vec!["happy"], &emotion_repo).await;

        let result = insert_talking_step_to_reaction(InsertTalkingStepToReactionRequest {
            reaction_id: String::from("new id"),
            emotion_id: String::from("happy"),
            ..base_request()
        }, &repository, &emotion_repo).await;

        assert!(matches!(result, Err(AddTalkingStepToReactionError::BadRequest(_))), "Expected insert step to fail with bad request");
    }

    #[tokio::test]
    async fn insert_talking_step_to_reaction_valid_input_store_in_repository() {
        let repository = InMemoryReactionRepository::new();
        let emotion_repo = InMemoryEmotionRepository::new();
        let reaction = setup_dummy_chat_command_reaction_definition(&repository).await;
        setup_dummy_emotions(vec!["happy"], &emotion_repo).await;

        insert_talking_step_to_reaction(InsertTalkingStepToReactionRequest {
            reaction_id: reaction.id.0.clone(),
            emotion_id: String::from("happy"),
            ..base_request()
        }, &repository, &emotion_repo).await.expect("Expected insert step not to fail");

        let reaction = get_reaction(GetReactionRequest { id: reaction.id.0 }, &repository).await.expect("Expected reaction to exists");
        assert_eq!(reaction.steps.len(), 1);
    }

    #[tokio::test]
    async fn insert_talking_step_to_reaction_text_alternatives_do_not_add_up_to_100_percent_probability_errors() {
        let repository = InMemoryReactionRepository::new();
        let emotion_repo = InMemoryEmotionRepository::new();
        let reaction = setup_dummy_chat_command_reaction_definition(&repository).await;
        setup_dummy_emotions(vec!["happy"], &emotion_repo).await;

        let result_over = insert_talking_step_to_reaction(InsertTalkingStepToReactionRequest {
            reaction_id: reaction.id.0.clone(),
            emotion_id: String::from("happy"),
            alternatives: vec![
                ReactionStepTextAlternativeDto { text: ReactionStepTextDto::Instant(String::from("some text2")), probability: Some(75.0) },
                ReactionStepTextAlternativeDto { text: ReactionStepTextDto::LetterByLetter(String::from("some text3")), probability: Some(26.0) },
            ],
            ..base_request()
        }, &repository, &emotion_repo).await;

        let result_under = insert_talking_step_to_reaction(InsertTalkingStepToReactionRequest {
            reaction_id: reaction.id.0.clone(),
            emotion_id: String::from("happy"),
            alternatives: vec![
                ReactionStepTextAlternativeDto { text: ReactionStepTextDto::Instant(String::from("some text2")), probability: Some(99.0) },
            ],
            ..base_request()
        }, &repository, &emotion_repo).await;

        assert!(matches!(result_over, Err(AddTalkingStepToReactionError::BadRequest(_))));
        assert!(matches!(result_under, Err(AddTalkingStepToReactionError::BadRequest(_))));
    }

    #[tokio::test]
    async fn insert_talking_step_to_reaction_text_alternatives_are_without_probability_save() {
        let repository = InMemoryReactionRepository::new();
        let emotion_repo = InMemoryEmotionRepository::new();
        let reaction = setup_dummy_chat_command_reaction_definition(&repository).await;
        setup_dummy_emotions(vec!["happy"], &emotion_repo).await;

        insert_talking_step_to_reaction(InsertTalkingStepToReactionRequest {
            reaction_id: reaction.id.0.clone(),
            emotion_id: String::from("happy"),
            alternatives: vec![
                ReactionStepTextAlternativeDto { text: ReactionStepTextDto::Instant(String::from("some text2")), probability: None },
                ReactionStepTextAlternativeDto { text: ReactionStepTextDto::LetterByLetter(String::from("some text3")), probability: None },
            ],
            ..base_request()
        }, &repository, &emotion_repo).await.expect("Inserting step with no probability alternatives should not fail");

        let talking_step = get_talking_animation_step_at(&repository, &reaction.id.0, 0).await;
        assert!(matches!(talking_step.text[..], [ReactionStepTextAlternativeDto {
            text: ReactionStepTextDto::Instant(_), probability: None
        }, ReactionStepTextAlternativeDto {
            text: ReactionStepTextDto::LetterByLetter(_), probability: None
        }]));
    }

    #[tokio::test]
    async fn insert_talking_step_to_reaction_text_no_alternatives_errors() {
        let repository = InMemoryReactionRepository::new();
        let emotion_repo = InMemoryEmotionRepository::new();
        let reaction = setup_dummy_chat_command_reaction_definition(&repository).await;
        setup_dummy_emotions(vec!["happy"], &emotion_repo).await;

        let result = insert_talking_step_to_reaction(InsertTalkingStepToReactionRequest {
            reaction_id: reaction.id.0.clone(),
            emotion_id: String::from("happy"),
            alternatives: vec![],
            ..base_request()
        }, &repository, &emotion_repo).await;

        assert!(matches!(result, Err(AddTalkingStepToReactionError::BadRequest(_))));
    }

    #[tokio::test]
    async fn insert_talking_step_to_reaction_correctly_save_text() {
        let repository = InMemoryReactionRepository::new();
        let emotion_repo = InMemoryEmotionRepository::new();
        let reaction = setup_dummy_chat_command_reaction_definition(&repository).await;
        setup_dummy_emotions(vec!["happy"], &emotion_repo).await;

        insert_talking_step_to_reaction(InsertTalkingStepToReactionRequest {
            reaction_id: reaction.id.0.clone(),
            emotion_id: String::from("happy"),
            alternatives: vec![ReactionStepTextAlternativeDto { text: ReactionStepTextDto::LetterByLetter(String::from("some text1")), probability: Some(100.0) }],
            ..base_request()
        }, &repository, &emotion_repo).await.expect("Expected insert step not to fail");
        insert_talking_step_to_reaction(InsertTalkingStepToReactionRequest {
            step_index: 1,
            reaction_id: reaction.id.0.clone(),
            emotion_id: String::from("happy"),
            alternatives: vec![
                ReactionStepTextAlternativeDto { text: ReactionStepTextDto::Instant(String::from("some text2")), probability: Some(75.0) },
                ReactionStepTextAlternativeDto { text: ReactionStepTextDto::LetterByLetter(String::from("some text3")), probability: Some(25.0) },
            ],
            ..base_request()
        }, &repository, &emotion_repo).await.expect("Expected insert step not to fail");

        let talking_step_1 = get_talking_animation_step_at(&repository, &reaction.id.0, 0).await;
        let talking_step_2 = get_talking_animation_step_at(&repository, &reaction.id.0, 1).await;

        assert!(matches!(talking_step_1.text[..], [ReactionStepTextAlternativeDto {
            text: ReactionStepTextDto::LetterByLetter(ref text),
            probability: Some(probability)
        }] if text == "some text1" && probability == 100.0));
        assert!(matches!(talking_step_2.text[..], [
            ReactionStepTextAlternativeDto { text: ReactionStepTextDto::Instant(ref text_1), probability: Some(probability_1) },
            ReactionStepTextAlternativeDto { text: ReactionStepTextDto::LetterByLetter(ref text_2), probability: Some(probability_2) },
        ] if text_1 == "some text2" && probability_1 == 75.0 && text_2 == "some text3" && probability_2 == 25.0));
    }

    #[tokio::test]
    async fn insert_talking_step_to_reaction_with_non_existing_emotion_id_errors() {
        let repository = InMemoryReactionRepository::new();
        let emotion_repo = InMemoryEmotionRepository::new();
        let reaction = setup_dummy_chat_command_reaction_definition(&repository).await;
        setup_dummy_emotions(vec!["happy"], &emotion_repo).await;

        let result = insert_talking_step_to_reaction(InsertTalkingStepToReactionRequest {
            reaction_id: reaction.id.0.clone(),
            emotion_id: String::from("not happy"),
            ..base_request()
        }, &repository, &emotion_repo).await;

        assert!(matches!(result, Err(AddTalkingStepToReactionError::BadEmotionRequest(_))), "Expected insert step to fail with bad emotion request");
    }

    #[tokio::test]
    async fn insert_talking_step_to_reaction_save_skip_configuration() {
        let repository = InMemoryReactionRepository::new();
        let emotion_repo = InMemoryEmotionRepository::new();
        let reaction = setup_dummy_chat_command_reaction_definition(&repository).await;
        setup_dummy_emotions(vec!["happy", "sad"], &emotion_repo).await;

        insert_talking_step_to_reaction(InsertTalkingStepToReactionRequest {
            reaction_id: reaction.id.0.clone(),
            step_index: 0,
            emotion_id: String::from("happy"),
            skip: ReactionStepSkipDto::ImmediatelyAfter,
            ..base_request()
        }, &repository, &emotion_repo).await.expect("Expected first insert step not to fail");

        insert_talking_step_to_reaction(InsertTalkingStepToReactionRequest {
            reaction_id: reaction.id.0.clone(),
            step_index: 1,
            emotion_id: String::from("sad"),
            skip: ReactionStepSkipDto::AfterMilliseconds(12),
            ..base_request()
        }, &repository, &emotion_repo).await.expect("Expected second insert step not to fail");

        insert_talking_step_to_reaction(InsertTalkingStepToReactionRequest {
            reaction_id: reaction.id.0.clone(),
            step_index: 2,
            emotion_id: String::from("sad"),
            skip: ReactionStepSkipDto::AfterStepWithExtraMilliseconds(10),
            ..base_request()
        }, &repository, &emotion_repo).await.expect("Expected second insert step not to fail");

        let first_talking_step = get_talking_animation_step_at(&repository, &reaction.id.0, 0).await;
        let second_talking_step = get_talking_animation_step_at(&repository, &reaction.id.0, 1).await;
        let third_talking_step = get_talking_animation_step_at(&repository, &reaction.id.0, 2).await;

        assert!(matches!(first_talking_step.skip, ReactionStepSkipDto::ImmediatelyAfter));
        assert!(matches!(second_talking_step.skip, ReactionStepSkipDto::AfterMilliseconds(ms) if ms == 12));
        assert!(matches!(third_talking_step.skip, ReactionStepSkipDto::AfterStepWithExtraMilliseconds(ms) if ms == 10));
    }

    async fn get_talking_animation_step_at(repository: &dyn ReactionDefinitionRepository, reaction_id: &String, index: usize) -> TalkingReactionStepDto {
        let step = try_get_animation_step_at(repository, reaction_id, index)
            .await.expect(format!("should have saved a step at index {}", index).as_str());
        if let ReactionStepDto::Talking(talking_step) = step {
            talking_step.clone()
        } else {
            unreachable!("should have saved a talking step");
        }
    }

    async fn try_get_animation_step_at(repository: &dyn ReactionDefinitionRepository, reaction_id: &String, index: usize) -> Result<ReactionStepDto, String> {
        let updated_reaction = get_reaction(GetReactionRequest { id: reaction_id.clone() }, repository)
            .await.expect(format!("should have a reaction with id {}", reaction_id).as_str());
        let maybe_step: Option<&ReactionStepDto> = updated_reaction.steps.get(index);
        maybe_step.map(|step| step.clone()).ok_or(format!("missing step at index {}", index))
    }

    fn base_request() -> InsertTalkingStepToReactionRequest {
        InsertTalkingStepToReactionRequest {
            alternatives: vec![ReactionStepTextAlternativeDto { text: ReactionStepTextDto::Instant(String::from("some text")), probability: Some(100.0) }],
            skip: ReactionStepSkipDto::ImmediatelyAfter,
            emotion_id: String::from("an emotion"),
            step_index: 0,
            reaction_id: String::from("an id")
        }
    }
}
