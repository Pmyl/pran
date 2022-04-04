use std::sync::Arc;
use std::fmt::Debug;
use thiserror::Error;
use crate::application::reactions::dtos::reaction_dto::ReactionDto;
use crate::domain::reactions::reaction::{Reaction, ReactionTrigger};
use crate::domain::reactions::reaction_repository::{ReactionRepository, ReactionInsertError};

#[derive(Debug, Error)]
pub enum CreateReactionError {
    #[error("Bad request")]
    BadRequest,
    #[error("Reaction with trigger {0} already exists")]
    Conflict(String),
    #[error("Unexpected error")]
    Unexpected,
}

pub struct CreateReactionRequest {
    pub trigger: String
}

pub fn create_reaction(request: CreateReactionRequest, repository: &Arc<dyn ReactionRepository>) -> Result<ReactionDto, CreateReactionError> {
    match ReactionTrigger::new_chat(request.trigger.clone()) {
        Ok(trigger) => {
            match repository.exists_with_trigger(&trigger) {
                false => {
                    let reaction = Reaction::new_empty(repository.next_id(), trigger);
                    repository.insert(&reaction).map_err(|_| CreateReactionError::Unexpected)?;

                    Ok(reaction.into())
                },
                true => Err(CreateReactionError::Conflict(request.trigger))
            }
        },
        _ => Err(CreateReactionError::BadRequest)
    }
}

#[cfg(test)]
mod tests {
    use crate::application::reactions::dtos::reaction_dto::ReactionTriggerDto;
    use crate::domain::reactions::reaction_repository::ReactionRepository;
    use crate::domain::reactions::reaction::{ReactionId, ReactionTrigger};
    use crate::persistence::reactions::in_memory_reaction_repository::InMemoryReactionRepository;
    use super::*;

    #[test]
    fn create_reaction_return_new_reaction_from_chat() {
        let trigger = String::from("!fire");
        let request = CreateReactionRequest { trigger: trigger.clone() };
        let repository: Arc<dyn ReactionRepository> = Arc::new(InMemoryReactionRepository::new());

        match create_reaction(request, &repository) {
            Ok(reaction) => match reaction.trigger {
                ReactionTriggerDto::Chat(text) => assert_eq!(text, trigger),
                _ => unreachable!("expected reaction to trigger through chat")
            },
            _ => unreachable!("expected create reaction to not fail")
        }
    }

    #[test]
    fn create_reaction_return_new_reaction_with_no_steps() {
        let request = CreateReactionRequest { trigger: String::from("!fire") };
        let repository: Arc<dyn ReactionRepository> = Arc::new(InMemoryReactionRepository::new());

        match create_reaction(request, &repository) {
            Ok(reaction) => assert!(reaction.steps.is_empty()),
            _ => unreachable!("expected create reaction to not fail")
        }
    }

    #[test]
    fn create_reaction_save_reaction_in_repository() {
        let request = CreateReactionRequest { trigger: String::from("!fire") };
        let repository = Arc::new(InMemoryReactionRepository::new());

        match create_reaction(request, &(repository.clone() as Arc<dyn ReactionRepository>)) {
            Ok(reaction) => assert!(repository.has(&ReactionId(reaction.id))),
            _ => unreachable!("expected create reaction to not fail")
        }
    }

    #[test]
    fn create_reaction_empty_trigger_error() {
        let request = CreateReactionRequest { trigger: String::from("") };
        let repository: Arc<dyn ReactionRepository> = Arc::new(InMemoryReactionRepository::new());

        match create_reaction(request, &repository) {
            Err(error) => match error {
                CreateReactionError::BadRequest => {},
                _ => unreachable!("expected create reaction to fail with bad request")
            },
            _ => unreachable!("expected create reaction to fail")
        }
    }

    #[test]
    fn create_reaction_twice_same_trigger_conflict_error() {
        let trigger = String::from("trigger1");
        let request1 = CreateReactionRequest { trigger: trigger.clone() };
        let request2 = CreateReactionRequest { trigger: trigger.clone() };
        let repository: Arc<dyn ReactionRepository> = Arc::new(InMemoryReactionRepository::new());
        create_reaction(request1, &repository.clone()).unwrap();

        match create_reaction(request2, &repository) {
            Err(error) => match error {
                CreateReactionError::Conflict(_) => {},
                _ => unreachable!("expected create reaction to fail with conflict")
            },
            _ => unreachable!("expected create reaction to fail")
        }
    }

    #[test]
    fn create_reaction_twice_different_trigger_not_fail() {
        let request1 = CreateReactionRequest { trigger: String::from("trigger1") };
        let request2 = CreateReactionRequest { trigger: String::from("trigger2") };
        let repository: Arc<dyn ReactionRepository> = Arc::new(InMemoryReactionRepository::new());
        create_reaction(request1, &repository.clone()).unwrap();

        match create_reaction(request2, &repository) {
            Ok(_) => {},
            _ => unreachable!("expected create reaction to not fail")
        }
    }
}
