use std::collections::HashSet;
use std::sync::Arc;
use std::fmt::Debug;
use thiserror::Error;
use crate::application::reactions::dtos::reaction_dto::{ReactionDto};
use crate::domain::reactions::reaction_definition::{ReactionDefinitionId, ReactionTrigger};
use crate::domain::reactions::reaction_definition_repository::{ReactionDefinitionRepository};

#[derive(Debug, Error)]
pub enum UpdateReactionError {
    #[error("Bad request")]
    BadRequest(String),
    #[error("Reaction with trigger {0:?} already exists")]
    Conflict(ReactionTrigger),
    #[error("Unexpected error")]
    Unexpected,
}

pub struct UpdateReactionRequest {
    pub id: String,
    pub triggers: Vec<String>
}

pub async fn update_reaction(request: UpdateReactionRequest, repository: &Arc<dyn ReactionDefinitionRepository>) -> Result<ReactionDto, UpdateReactionError> {
    assert_no_duplicates(&request)?;

    let triggers = build_triggers(&request)?;
    let reaction_definition_id = ReactionDefinitionId(request.id);
    assert_no_trigger_already_exists(&reaction_definition_id, &triggers, &repository).await?;

    let mut definition = repository.get(&reaction_definition_id).await
        .ok_or_else(|| UpdateReactionError::BadRequest(String::from("The requested reaction id does not exist")))?;
    definition.update_triggers(triggers)
        .map_err(|_| UpdateReactionError::BadRequest(String::from("The triggers to update are malformed")))?;
    repository.update(&definition).await.map_err(|_| UpdateReactionError::Unexpected)?;

    Ok(definition.into())
}

fn build_triggers(request: &UpdateReactionRequest) -> Result<Vec<ReactionTrigger>, UpdateReactionError> {
    let mut triggers = vec![];
    for trigger in &request.triggers {
        let command_trigger = ReactionTrigger::new_chat(trigger.clone())
            .map_err(|_| UpdateReactionError::BadRequest(String::from("Provided `trigger` is invalid")))?;
        triggers.push(command_trigger);
    }

    Ok(triggers)
}

fn assert_no_duplicates(request: &UpdateReactionRequest) -> Result<(), UpdateReactionError> {
    let mut uniq = HashSet::new();
    if !request.triggers.iter().all(move |trigger| uniq.insert(trigger)) {
        Err(UpdateReactionError::BadRequest(String::from("Multiple of same trigger provided, remove duplicates")))
    } else {
        Ok(())
    }
}

async fn assert_no_trigger_already_exists(id: &ReactionDefinitionId, triggers: &Vec<ReactionTrigger>, repository: &Arc<dyn ReactionDefinitionRepository>) -> Result<(), UpdateReactionError> {
    for trigger in triggers.iter() {
        if repository.other_exists_with_trigger(trigger, id).await {
            return Err(UpdateReactionError::Conflict(trigger.clone()));
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use crate::application::reactions::create::{create_reaction, CreateReactionRequest};
    use crate::application::reactions::dtos::reaction_dto::ReactionTriggerDto;
    use crate::application::reactions::get::{get_reaction, GetReactionRequest};
    use crate::domain::reactions::reaction_definition_repository::ReactionDefinitionRepository;
    use crate::persistence::reactions::in_memory_reaction_repository::InMemoryReactionRepository;
    use super::*;

    #[tokio::test]
    async fn update_reaction_with_duplicates_error() {
        let triggers = vec![String::from("!fire"), String::from("!water"), String::from("!fire")];
        let request = UpdateReactionRequest { triggers, id: String::from("an id") };
        let repository: Arc<dyn ReactionDefinitionRepository> = Arc::new(InMemoryReactionRepository::new());

        let result = update_reaction(request, &repository).await;

        assert!(matches!(result, Err(UpdateReactionError::BadRequest(_))));
    }

    #[tokio::test]
    async fn update_reaction_single_and_same_trigger_ok() {
        let repository: Arc<dyn ReactionDefinitionRepository> = Arc::new(InMemoryReactionRepository::new());
        let reaction = create_reaction(CreateReactionRequest { trigger: String::from("!fire") }, &repository).await.unwrap();

        let request = UpdateReactionRequest { triggers: vec![String::from("!fire")], id: reaction.id.clone() };
        let result = update_reaction(request, &repository).await;

        let fetched_reaction = get_reaction(GetReactionRequest { id: reaction.id }, &repository).await.unwrap();
        assert!(matches!(result, Ok(_)));
        assert!(matches!(result.unwrap().trigger, ReactionTriggerDto::Chat(command) if command == "!fire"));
        assert!(matches!(fetched_reaction.trigger, ReactionTriggerDto::Chat(command) if command == "!fire"));
    }

    #[tokio::test]
    async fn update_reaction_single_and_different_updates_trigger() {
        let repository: Arc<dyn ReactionDefinitionRepository> = Arc::new(InMemoryReactionRepository::new());
        let reaction = create_reaction(CreateReactionRequest { trigger: String::from("!fire") }, &repository).await.unwrap();

        let request = UpdateReactionRequest { triggers: vec![String::from("!water")], id: reaction.id.clone() };
        let result = update_reaction(request, &repository).await;

        let fetched_reaction = get_reaction(GetReactionRequest { id: reaction.id }, &repository).await.unwrap();
        assert!(matches!(result, Ok(_)));
        assert!(matches!(result.unwrap().trigger, ReactionTriggerDto::Chat(command) if command == "!water"));
        assert!(matches!(fetched_reaction.trigger, ReactionTriggerDto::Chat(command) if command == "!water"));
    }

    #[tokio::test]
    async fn update_reaction_not_existing_id_error() {
        let repository: Arc<dyn ReactionDefinitionRepository> = Arc::new(InMemoryReactionRepository::new());
        create_reaction(CreateReactionRequest { trigger: String::from("!fire") }, &repository).await.unwrap();

        let request = UpdateReactionRequest { triggers: vec![String::from("!water")], id: String::from("different id") };
        let result = update_reaction(request, &repository).await;

        assert!(matches!(result, Err(UpdateReactionError::BadRequest(_))));
    }

    #[tokio::test]
    async fn update_reaction_one_of_triggers_exists_conflict_error() {
        let repository: Arc<dyn ReactionDefinitionRepository> = Arc::new(InMemoryReactionRepository::new());
        let reaction = create_reaction(CreateReactionRequest { trigger: String::from("!fire") }, &repository).await.unwrap();
        create_reaction(CreateReactionRequest { trigger: String::from("!grass") }, &repository).await.unwrap();

        let request = UpdateReactionRequest { triggers: vec![String::from("!water"), String::from("!grass")], id: reaction.id.clone() };
        let result = update_reaction(request, &repository).await;

        assert!(matches!(result, Err(UpdateReactionError::Conflict(_))));
    }

    #[tokio::test]
    async fn update_reaction_with_no_triggers_bad_request_error() {
        let repository: Arc<dyn ReactionDefinitionRepository> = Arc::new(InMemoryReactionRepository::new());
        let reaction = create_reaction(CreateReactionRequest { trigger: String::from("!fire") }, &repository).await.unwrap();

        let request = UpdateReactionRequest { triggers: vec![], id: reaction.id.clone() };
        let result = update_reaction(request, &repository).await;

        assert!(matches!(result, Err(UpdateReactionError::BadRequest(_))));
    }
}
