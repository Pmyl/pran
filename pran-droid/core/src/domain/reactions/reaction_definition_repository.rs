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

    pub async fn setup_dummy_chat_command_reaction_definition(repository: &dyn ReactionDefinitionRepository) -> ReactionDefinition {
        setup_dummy_chat_command_reaction_definitions(vec!["a trigger"], repository).await.into_iter().next().unwrap()
    }

    pub async fn setup_dummy_chat_command_reaction_definitions(chat_command_triggers: Vec<&str>, repository: &dyn ReactionDefinitionRepository) -> Vec<ReactionDefinition> {
        setup_dummy_reaction_definitions_with_triggers(
            chat_command_triggers.iter().map(|trigger| ReactionTrigger::new_chat_command(trigger.to_string()).unwrap()).collect(),
            repository
        ).await
    }

    pub async fn setup_dummy_chat_keyword_reaction_definitions(chat_keyword_triggers: Vec<&str>, repository: &dyn ReactionDefinitionRepository) -> Vec<ReactionDefinition> {
        setup_dummy_reaction_definitions_with_triggers(
            chat_keyword_triggers.iter().map(|trigger| ReactionTrigger::new_chat_keyword(trigger.to_string()).unwrap()).collect(),
            repository
        ).await
    }

    async fn setup_dummy_reaction_definitions_with_triggers(triggers: Vec<ReactionTrigger>, repository: &dyn ReactionDefinitionRepository) -> Vec<ReactionDefinition> {
        let mut reactions = vec![];

        for trigger in triggers {
            let definition = ReactionDefinition::new_empty(
                ReactionDefinitionId(format!("{:?}_id", trigger)),
                trigger.clone()
            );
            repository.insert(&definition).await.unwrap();

            reactions.push(definition);
        }

        reactions
    }
}