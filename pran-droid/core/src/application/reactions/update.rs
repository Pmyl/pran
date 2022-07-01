use std::collections::HashSet;
use std::sync::Arc;
use std::fmt::Debug;
use thiserror::Error;
use crate::application::reactions::dtos::reaction_dto::{ReactionDto, ReactionTriggerDto};
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

impl UpdateReactionError {
    fn missing_reaction() -> Self { UpdateReactionError::BadRequest(String::from("The requested reaction id does not exist")) }
    fn malformed_triggers() -> Self { UpdateReactionError::BadRequest(String::from("The triggers to update are malformed")) }
}

#[derive(Default)]
pub struct UpdateReactionRequest {
    pub id: String,
    pub triggers: Option<Vec<ReactionTriggerDto>>,
    pub is_disabled: Option<bool>,
    pub count: Option<u32>
}

pub async fn update_reaction(request: UpdateReactionRequest, repository: &Arc<dyn ReactionDefinitionRepository>) -> Result<ReactionDto, UpdateReactionError> {
    let reaction_definition_id = ReactionDefinitionId(request.id);

    let mut definition = repository.get(&reaction_definition_id).await.ok_or_else(|| UpdateReactionError::missing_reaction())?;

    if let Some(request_triggers) = request.triggers {
        assert_no_duplicate_triggers(&request_triggers)?;
        let triggers = build_domain_triggers(request_triggers)?;
        assert_no_trigger_already_exists(&reaction_definition_id, &triggers, &repository).await?;

        definition.update_triggers(triggers).map_err(|_| UpdateReactionError::malformed_triggers())?;
    }

    if let Some(request_is_disable) = request.is_disabled {
        if request_is_disable { definition.disable() } else { definition.enable() }
    }

    if let Some(request_count) = request.count {
        definition.update_count(request_count);
    }

    repository.update(&definition).await.map_err(|_| UpdateReactionError::Unexpected)?;

    Ok(definition.into())
}

fn build_domain_triggers(request_triggers: Vec<ReactionTriggerDto>) -> Result<Vec<ReactionTrigger>, UpdateReactionError> {
    let mut triggers = vec![];
    for trigger in request_triggers {
        let command_trigger = trigger.try_into()
            .map_err(|_| UpdateReactionError::BadRequest(String::from("Provided `trigger` is invalid")))?;
        triggers.push(command_trigger);
    }

    Ok(triggers)
}

fn assert_no_duplicate_triggers(triggers: &Vec<ReactionTriggerDto>) -> Result<(), UpdateReactionError> {
    let mut uniq = HashSet::new();
    if !triggers.iter().all(move |trigger| {
        if let ReactionTriggerDto::ChatCommand(command_trigger) = trigger { uniq.insert(command_trigger) } else { true }
    }) {
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
    async fn update_reaction_with_duplicate_command_triggers_error() {
        let repository: Arc<dyn ReactionDefinitionRepository> = Arc::new(InMemoryReactionRepository::new());
        let reaction = create_reaction(CreateReactionRequest { trigger: command_dto("!some") }, &repository).await.unwrap();

        let triggers = vec![command_dto("!fire"), command_dto("!water"), command_dto("!fire")];
        let request = create_request(&reaction, |req| req.triggers = Some(triggers));

        let result = update_reaction(request, &repository).await;

        assert!(matches!(result, Err(UpdateReactionError::BadRequest(_))));
    }

    #[tokio::test]
    async fn update_reaction_single_and_same_trigger_ok() {
        let repository: Arc<dyn ReactionDefinitionRepository> = Arc::new(InMemoryReactionRepository::new());
        let reaction = create_reaction(CreateReactionRequest { trigger: command_dto("!fire") }, &repository).await.unwrap();

        let request = create_request(&reaction, |req| req.triggers = Some(vec![command_dto("!fire")]));
        let result = update_reaction(request, &repository).await;

        let fetched_reaction = get_reaction(GetReactionRequest { id: reaction.id }, &repository).await.unwrap();
        assert!(matches!(result, Ok(_)));
        assert!(matches!(&result.unwrap().triggers[..], [ReactionTriggerDto::ChatCommand(command)] if command == "!fire"));
        assert!(matches!(&fetched_reaction.triggers[..], [ReactionTriggerDto::ChatCommand(command)] if command == "!fire"));
    }

    #[tokio::test]
    async fn update_reaction_single_and_different_trigger_updates_trigger() {
        let repository: Arc<dyn ReactionDefinitionRepository> = Arc::new(InMemoryReactionRepository::new());
        let reaction = create_reaction(CreateReactionRequest { trigger: command_dto("!fire") }, &repository).await.unwrap();

        let request = create_request(&reaction, |req| req.triggers = Some(vec![command_dto("!water")]));
        let result = update_reaction(request, &repository).await;

        let fetched_reaction = get_reaction(GetReactionRequest { id: reaction.id }, &repository).await.unwrap();
        assert!(matches!(result, Ok(_)));
        assert!(matches!(&result.unwrap().triggers[..], [ReactionTriggerDto::ChatCommand(command)] if command == "!water"));
        assert!(matches!(&fetched_reaction.triggers[..], [ReactionTriggerDto::ChatCommand(command)] if command == "!water"));
    }

    #[tokio::test]
    async fn update_reaction_not_existing_id_error() {
        let repository: Arc<dyn ReactionDefinitionRepository> = Arc::new(InMemoryReactionRepository::new());
        let reaction = create_reaction(CreateReactionRequest { trigger: command_dto("!fire") }, &repository).await.unwrap();

        let request = create_request(&reaction, |req| {
            req.triggers = Some(vec![command_dto("!water"), command_dto("!grass")]);
            req.id = String::from("different id");
        });

        let result = update_reaction(request, &repository).await;

        assert!(matches!(result, Err(UpdateReactionError::BadRequest(_))));
    }

    #[tokio::test]
    async fn update_reaction_one_of_triggers_exists_conflict_error() {
        let repository: Arc<dyn ReactionDefinitionRepository> = Arc::new(InMemoryReactionRepository::new());
        let reaction = create_reaction(CreateReactionRequest { trigger: command_dto("!fire") }, &repository).await.unwrap();
        create_reaction(CreateReactionRequest { trigger: command_dto("!grass") }, &repository).await.unwrap();

        let request = create_request(&reaction, |req| req.triggers = Some(vec![command_dto("!water"), command_dto("!grass")]));
        let result = update_reaction(request, &repository).await;

        assert!(matches!(result, Err(UpdateReactionError::Conflict(_))));
    }

    #[tokio::test]
    async fn update_reaction_with_no_triggers_bad_request_error() {
        let repository: Arc<dyn ReactionDefinitionRepository> = Arc::new(InMemoryReactionRepository::new());
        let reaction = create_reaction(CreateReactionRequest { trigger: command_dto("!fire") }, &repository).await.unwrap();

        let request = create_request(&reaction, |req| req.triggers = Some(vec![]));
        let result = update_reaction(request, &repository).await;

        assert!(matches!(result, Err(UpdateReactionError::BadRequest(_))));
    }

    #[tokio::test]
    async fn update_reaction_set_disable_updates_reaction() {
        let repository: Arc<dyn ReactionDefinitionRepository> = Arc::new(InMemoryReactionRepository::new());
        let reaction = create_reaction(CreateReactionRequest { trigger: command_dto("!fire") }, &repository).await.unwrap();

        let request = create_request(&reaction, |req| req.is_disabled = Some(true));
        let result = update_reaction(request, &repository).await;
        assert!(matches!(result, Ok(dto) if dto.is_disabled == true));

        let request = create_request(&reaction, |req| req.is_disabled = Some(false));
        let result = update_reaction(request, &repository).await;
        assert!(matches!(result, Ok(dto) if dto.is_disabled == false));
    }

    #[tokio::test]
    async fn update_reaction_set_count_updates_reaction() {
        let repository: Arc<dyn ReactionDefinitionRepository> = Arc::new(InMemoryReactionRepository::new());
        let reaction = create_reaction(CreateReactionRequest { trigger: command_dto("!fire") }, &repository).await.unwrap();

        let request = create_request(&reaction, |req| req.count = Some(14));
        let result = update_reaction(request, &repository).await;
        assert!(matches!(result, Ok(dto) if dto.count == 14));
    }

    fn create_request<F>(reaction: &ReactionDto, configure: F) -> UpdateReactionRequest where F: FnOnce(&mut UpdateReactionRequest) -> () {
        let mut req = UpdateReactionRequest { id: reaction.id.clone(), triggers: None, is_disabled: None, count: None };
        configure(&mut req);
        req
    }

    fn command_dto(text: &str) -> ReactionTriggerDto {
        ReactionTriggerDto::ChatCommand(String::from(text))
    }
}
