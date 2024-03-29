use std::fmt::Debug;
use thiserror::Error;
use crate::application::reactions::dtos::reaction_dto::{ReactionDto, ReactionTriggerDto};
use crate::domain::reactions::reaction_definition::{ReactionDefinition, ReactionTrigger};
use crate::domain::reactions::reaction_definition_repository::{ReactionDefinitionRepository};

#[derive(Debug, Error)]
pub enum CreateReactionError {
    #[error("Bad request")]
    BadRequest(String),
    #[error("Reaction with trigger {0:?} already exists")]
    Conflict(ReactionTrigger),
    #[error("Unexpected error")]
    Unexpected,
}

pub struct CreateReactionRequest {
    pub trigger: ReactionTriggerDto
}

pub async fn create_reaction(request: CreateReactionRequest, repository: &dyn ReactionDefinitionRepository) -> Result<ReactionDto, CreateReactionError> {
    let trigger = request.trigger.try_into()
        .map_err(|_| CreateReactionError::BadRequest(String::from("Provided `trigger` is invalid")))?;

    if !repository.exists_with_trigger(&trigger).await {
        let reaction = ReactionDefinition::new_empty(repository.next_id(), trigger);
        repository.insert(&reaction).await.map_err(|_| CreateReactionError::Unexpected)?;

        Ok(reaction.into())
    } else {
        Err(CreateReactionError::Conflict(trigger))
    }
}

#[cfg(test)]
mod tests {
    use crate::application::reactions::dtos::reaction_dto::ReactionTriggerDto;
    use crate::domain::reactions::reaction_definition::{ReactionDefinitionId};
    use crate::persistence::reactions::in_memory_reaction_repository::InMemoryReactionRepository;
    use super::*;

    #[tokio::test]
    async fn create_reaction_return_new_reaction_from_chat_command() {
        let trigger = String::from("!fire");
        let request = CreateReactionRequest { trigger: ReactionTriggerDto::ChatCommand(trigger.clone()) };
        let repository: InMemoryReactionRepository = InMemoryReactionRepository::new();

        match create_reaction(request, &repository).await {
            Ok(reaction) => match &reaction.triggers[..] {
                [ReactionTriggerDto::ChatCommand(text)] => assert_eq!(text, &trigger),
                _ => unreachable!("expected reaction to trigger through chat")
            },
            _ => unreachable!("expected create reaction to not fail")
        }
    }

    #[tokio::test]
    async fn create_reaction_return_new_reaction_from_chat_keyword() {
        let trigger = String::from("!fire");
        let request = CreateReactionRequest { trigger: ReactionTriggerDto::ChatKeyword(trigger.clone()) };
        let repository: InMemoryReactionRepository = InMemoryReactionRepository::new();

        match create_reaction(request, &repository).await {
            Ok(reaction) => match &reaction.triggers[..] {
                [ReactionTriggerDto::ChatKeyword(text)] => assert_eq!(text, &trigger),
                _ => unreachable!("expected reaction to trigger through chat")
            },
            _ => unreachable!("expected create reaction to not fail")
        }
    }

    #[tokio::test]
    async fn create_reaction_return_new_reaction_with_no_steps() {
        let request = CreateReactionRequest { trigger: ReactionTriggerDto::ChatCommand(String::from("!fire")) };
        let repository: InMemoryReactionRepository = InMemoryReactionRepository::new();

        match create_reaction(request, &repository).await {
            Ok(reaction) => assert!(reaction.steps.is_empty()),
            _ => unreachable!("expected create reaction to not fail")
        }
    }

    #[tokio::test]
    async fn create_reaction_return_new_reaction_enabled() {
        let request = CreateReactionRequest { trigger: ReactionTriggerDto::ChatCommand(String::from("!fire")) };
        let repository: InMemoryReactionRepository = InMemoryReactionRepository::new();

        match create_reaction(request, &repository).await {
            Ok(reaction) => assert_eq!(reaction.is_disabled, false),
            _ => unreachable!("expected create reaction to not fail")
        }
    }

    #[tokio::test]
    async fn create_reaction_return_new_reaction_with_zero_usages() {
        let request = CreateReactionRequest { trigger: ReactionTriggerDto::ChatCommand(String::from("!fire")) };
        let repository: InMemoryReactionRepository = InMemoryReactionRepository::new();

        match create_reaction(request, &repository).await {
            Ok(reaction) => assert_eq!(reaction.count, 0),
            _ => unreachable!("expected create reaction to not fail")
        }
    }

    #[tokio::test]
    async fn create_reaction_save_reaction_in_repository() {
        let request = CreateReactionRequest { trigger: ReactionTriggerDto::ChatCommand(String::from("!fire")) };
        let repository = InMemoryReactionRepository::new();

        match create_reaction(request, &repository).await {
            Ok(reaction) => assert!(repository.has(&ReactionDefinitionId(reaction.id))),
            _ => unreachable!("expected create reaction to not fail")
        }
    }

    #[tokio::test]
    async fn create_reaction_empty_trigger_error() {
        let request = CreateReactionRequest { trigger: ReactionTriggerDto::ChatCommand(String::from("")) };
        let repository = InMemoryReactionRepository::new();

        match create_reaction(request, &repository).await {
            Err(error) => match error {
                CreateReactionError::BadRequest(_) => {},
                _ => unreachable!("expected create reaction to fail with bad request")
            },
            _ => unreachable!("expected create reaction to fail")
        }
    }

    #[tokio::test]
    async fn create_reaction_twice_same_command_trigger_conflict_error() {
        let trigger = ReactionTriggerDto::ChatCommand(String::from("trigger1"));
        let request1 = CreateReactionRequest { trigger: trigger.clone() };
        let request2 = CreateReactionRequest { trigger: trigger.clone() };
        let repository = InMemoryReactionRepository::new();
        create_reaction(request1, &repository).await.unwrap();

        match create_reaction(request2, &repository).await {
            Err(error) => match error {
                CreateReactionError::Conflict(_) => {},
                _ => unreachable!("expected create reaction to fail with conflict")
            },
            _ => unreachable!("expected create reaction to fail")
        }
    }

    #[tokio::test]
    async fn create_reaction_twice_different_command_trigger_not_fail() {
        let request1 = CreateReactionRequest { trigger: ReactionTriggerDto::ChatCommand(String::from("trigger1")) };
        let request2 = CreateReactionRequest { trigger: ReactionTriggerDto::ChatCommand(String::from("trigger2")) };
        let repository = InMemoryReactionRepository::new();
        create_reaction(request1, &repository).await.unwrap();

        match create_reaction(request2, &repository).await {
            Ok(_) => {},
            _ => unreachable!("expected create reaction to not fail")
        }
    }
}
