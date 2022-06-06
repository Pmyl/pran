use std::sync::Arc;
use std::fmt::Debug;
use thiserror::Error;
use crate::application::reactions::dtos::reaction_step_dto::{ReactionStepDto, ReactionStepSkipDto};
use crate::domain::emotions::emotion::EmotionId;
use crate::domain::emotions::emotion_repository::EmotionRepository;
use crate::domain::reactions::reaction_definition::{ReactionDefinition, ReactionDefinitionId, ReactionStepTextDefinition, TalkingReactionStepDefinition};
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
    pub text: String
}

pub fn insert_talking_step_to_reaction(request: InsertTalkingStepToReactionRequest, repository: &Arc<dyn ReactionDefinitionRepository>, emotion_repository: &Arc<dyn EmotionRepository>) -> Result<ReactionStepDto, AddTalkingStepToReactionError> {
    let mut reaction = repository.get(&ReactionDefinitionId(request.reaction_id.clone()))
        .ok_or_else(|| AddTalkingStepToReactionError::BadRequest(String::from("The requested reaction id does not exist")))?;

    let reaction_step = TalkingReactionStepDefinition {
        skip: request.skip.into(),
        emotion_id: EmotionId(request.emotion_id),
        text: ReactionStepTextDefinition::LetterByLetter(request.text)
    };
    insert_step_in_correct_index(&mut reaction, reaction_step.clone(), request.step_index, emotion_repository)?;
    repository.update(&reaction).unwrap();

    Ok(reaction_step.into())
}

fn insert_step_in_correct_index(reaction: &mut ReactionDefinition, reaction_step: TalkingReactionStepDefinition, step_index: usize, emotion_repository: &Arc<dyn EmotionRepository>) -> Result<(), AddTalkingStepToReactionError> {
    if step_index > reaction.steps.len() {
        return Err(AddTalkingStepToReactionError::BadRequest(String::from("Index out of bounds")));
    } else if step_index == reaction.steps.len() {
        add_talking_step_to_reaction(reaction, reaction_step, emotion_repository)?;
    } else {
        replace_talking_step_in_reaction(reaction, reaction_step, step_index, emotion_repository)?;
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
    use crate::domain::reactions::reaction_definition_repository::tests::setup_dummy_chat_reaction_definition;
    use crate::persistence::emotions::in_memory_emotion_repository::InMemoryEmotionRepository;

    #[test]
    fn insert_talking_step_to_reaction_wrong_id_return_error() {
        let repository: Arc<dyn ReactionDefinitionRepository> = Arc::new(InMemoryReactionRepository::new());
        let emotion_repo: Arc<dyn EmotionRepository> = Arc::new(InMemoryEmotionRepository::new());
        setup_dummy_chat_reaction_definition(&repository);
        setup_dummy_emotions(vec!["happy"], &emotion_repo);

        let result = insert_talking_step_to_reaction(InsertTalkingStepToReactionRequest {
            reaction_id: String::from("new id"),
            emotion_id: String::from("happy"),
            ..base_request()
        }, &repository, &emotion_repo);

        assert!(matches!(result, Err(AddTalkingStepToReactionError::BadRequest(_))), "Expected insert step to fail with bad request");
    }

    #[test]
    fn insert_talking_step_to_reaction_valid_input_store_in_repository() {
        let repository: Arc<dyn ReactionDefinitionRepository> = Arc::new(InMemoryReactionRepository::new());
        let emotion_repo: Arc<dyn EmotionRepository> = Arc::new(InMemoryEmotionRepository::new());
        let reaction = setup_dummy_chat_reaction_definition(&repository);
        setup_dummy_emotions(vec!["happy"], &emotion_repo);

        insert_talking_step_to_reaction(InsertTalkingStepToReactionRequest {
            reaction_id: reaction.id.0.clone(),
            emotion_id: String::from("happy"),
            ..base_request()
        }, &repository, &emotion_repo).expect("Expected insert step not to fail");

        let reaction = get_reaction(GetReactionRequest { id: reaction.id.0 }, &repository).expect("Expected reaction to exists");
        assert_eq!(reaction.steps.len(), 1);
    }

    #[test]
    fn insert_talking_step_to_reaction_correctly_save_text_letter_by_letter() {
        let repository: Arc<dyn ReactionDefinitionRepository> = Arc::new(InMemoryReactionRepository::new());
        let emotion_repo: Arc<dyn EmotionRepository> = Arc::new(InMemoryEmotionRepository::new());
        let reaction = setup_dummy_chat_reaction_definition(&repository);
        setup_dummy_emotions(vec!["happy"], &emotion_repo);

        insert_talking_step_to_reaction(InsertTalkingStepToReactionRequest {
            reaction_id: reaction.id.0.clone(),
            emotion_id: String::from("happy"),
            text: String::from("some text"),
            ..base_request()
        }, &repository, &emotion_repo).expect("Expected insert step not to fail");

        let talking_step = get_talking_animation_step_at(&repository, reaction.id.0, 0);

        assert!(matches!(talking_step.text, ReactionStepTextDto::LetterByLetter(text) if text == "some text"));
    }

    #[test]
    fn insert_talking_step_to_reaction_with_non_existing_emotion_id_errors() {
        let repository: Arc<dyn ReactionDefinitionRepository> = Arc::new(InMemoryReactionRepository::new());
        let emotion_repo: Arc<dyn EmotionRepository> = Arc::new(InMemoryEmotionRepository::new());
        let reaction = setup_dummy_chat_reaction_definition(&repository);
        setup_dummy_emotions(vec!["happy"], &emotion_repo);

        let result = insert_talking_step_to_reaction(InsertTalkingStepToReactionRequest {
            reaction_id: reaction.id.0.clone(),
            emotion_id: String::from("not happy"),
            ..base_request()
        }, &repository, &emotion_repo);

        assert!(matches!(result, Err(AddTalkingStepToReactionError::BadEmotionRequest(_))), "Expected insert step to fail with bad emotion request");
    }

    #[test]
    fn insert_talking_step_to_reaction_save_skip_configuration() {
        let repository: Arc<dyn ReactionDefinitionRepository> = Arc::new(InMemoryReactionRepository::new());
        let emotion_repo: Arc<dyn EmotionRepository> = Arc::new(InMemoryEmotionRepository::new());
        let reaction = setup_dummy_chat_reaction_definition(&repository);
        setup_dummy_emotions(vec!["happy", "sad"], &emotion_repo);

        insert_talking_step_to_reaction(InsertTalkingStepToReactionRequest {
            reaction_id: reaction.id.0.clone(),
            step_index: 0,
            emotion_id: String::from("happy"),
            skip: ReactionStepSkipDto::ImmediatelyAfter,
            ..base_request()
        }, &repository, &emotion_repo).expect("Expected first insert step not to fail");

        insert_talking_step_to_reaction(InsertTalkingStepToReactionRequest {
            reaction_id: reaction.id.0.clone(),
            step_index: 1,
            emotion_id: String::from("sad"),
            skip: ReactionStepSkipDto::AfterMilliseconds(12),
            ..base_request()
        }, &repository, &emotion_repo).expect("Expected second insert step not to fail");

        let first_talking_step = get_talking_animation_step_at(&repository, reaction.id.0.clone(), 0);
        let second_talking_step = get_talking_animation_step_at(&repository, reaction.id.0, 1);

        assert!(matches!(first_talking_step.skip, ReactionStepSkipDto::ImmediatelyAfter));
        assert!(matches!(second_talking_step.skip, ReactionStepSkipDto::AfterMilliseconds(ms) if ms == 12));
    }

    fn get_talking_animation_step_at(repository: &Arc<dyn ReactionDefinitionRepository>, reaction_id: String, index: usize) -> TalkingReactionStepDto {
        let step = try_get_animation_step_at(repository, reaction_id.clone(), index)
            .expect(format!("should have saved a step at index {}", index).as_str());
        if let ReactionStepDto::Talking(talking_step) = step {
            talking_step.clone()
        } else {
            unreachable!("should have saved a talking step");
        }
    }

    fn try_get_animation_step_at(repository: &Arc<dyn ReactionDefinitionRepository>, reaction_id: String, index: usize) -> Result<ReactionStepDto, String> {
        let updated_reaction = get_reaction(GetReactionRequest { id: reaction_id.clone() }, &repository)
            .expect(format!("should have a reaction with id {}", reaction_id).as_str());
        let maybe_step: Option<&ReactionStepDto> = updated_reaction.steps.get(index);
        maybe_step.map(|step| step.clone()).ok_or(format!("missing step at index {}", index))
    }

    fn base_request() -> InsertTalkingStepToReactionRequest {
        InsertTalkingStepToReactionRequest {
            text: String::from("some text"),
            skip: ReactionStepSkipDto::ImmediatelyAfter,
            emotion_id: String::from("an emotion"),
            step_index: 0,
            reaction_id: String::from("an id")
        }
    }
}
