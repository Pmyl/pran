use async_trait::async_trait;
use std::fmt::Debug;
use thiserror::Error;
use crate::domain::reactions::reaction_definition::{ReactionDefinition, ReactionDefinitionId, ReactionTrigger};

#[derive(Debug, Error)]
pub enum ReactionInsertError {
    #[error("Unexpected error while inserting the reaction")]
    Unexpected,
    #[error("Trying to insert an reaction with existing id")]
    Conflict
}

#[derive(Debug, Error)]
pub enum ReactionUpdateError {
    #[error("Trying to update a not existing reaction")]
    Missing
}

#[async_trait]
pub trait ReactionDefinitionRepository: Send + Sync {
    fn next_id(&self) -> ReactionDefinitionId;
    async fn insert(&self, reaction: &ReactionDefinition) -> Result<(), ReactionInsertError>;
    async fn exists_with_trigger(&self, trigger: &ReactionTrigger) -> bool;
    async fn other_exists_with_trigger(&self, trigger: &ReactionTrigger, excluded_reaction_definition_id: &ReactionDefinitionId) -> bool;
    async fn get(&self, id: &ReactionDefinitionId) -> Option<ReactionDefinition>;
    async fn get_all(&self) -> Vec<ReactionDefinition>;
    async fn update(&self, reaction: &ReactionDefinition) -> Result<(), ReactionUpdateError>;
}

#[cfg(test)]
pub mod tests {
    use std::sync::Arc;
    use super::*;

    pub async fn setup_dummy_chat_reaction_definition(repository: &Arc<dyn ReactionDefinitionRepository>) -> ReactionDefinition {
        let definition = ReactionDefinition::new_empty(
            ReactionDefinitionId(String::from("an id")),
            ReactionTrigger::new_chat(String::from("a trigger")).unwrap()
        );
        repository.insert(&definition).await.unwrap();

        definition
    }

    pub async fn setup_dummy_chat_reaction_definitions(chat_triggers: Vec<&str>, repository: &Arc<dyn ReactionDefinitionRepository>) -> Vec<ReactionDefinition> {
        let mut reactions = vec![];

        for trigger in chat_triggers {
            let definition = ReactionDefinition::new_empty(
                ReactionDefinitionId(format!("{}_id", trigger)),
                ReactionTrigger::new_chat(trigger.to_string()).unwrap()
            );
            repository.insert(&definition).await.unwrap();

            reactions.push(definition);
        }

        reactions
    }
}