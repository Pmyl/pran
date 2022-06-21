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

pub trait ReactionDefinitionRepository: Send + Sync {
    fn next_id(&self) -> ReactionDefinitionId;
    fn insert(&self, reaction: &ReactionDefinition) -> Result<(), ReactionInsertError>;
    fn exists_with_trigger(&self, trigger: &ReactionTrigger) -> bool;
    fn other_exists_with_trigger(&self, trigger: &ReactionTrigger, excluded_reaction_definition_id: &ReactionDefinitionId) -> bool;
    fn get(&self, id: &ReactionDefinitionId) -> Option<ReactionDefinition>;
    fn get_all(&self) -> Vec<ReactionDefinition>;
    fn update(&self, reaction: &ReactionDefinition) -> Result<(), ReactionUpdateError>;
}

#[cfg(test)]
pub mod tests {
    use std::sync::Arc;
    use super::*;

    pub fn setup_dummy_chat_reaction_definition(repository: &Arc<dyn ReactionDefinitionRepository>) -> ReactionDefinition {
        let definition = ReactionDefinition::new_empty(
            ReactionDefinitionId(String::from("an id")),
            ReactionTrigger::new_chat(String::from("a trigger")).unwrap()
        );
        repository.insert(&definition).unwrap();

        definition
    }

    pub fn setup_dummy_chat_reaction_definitions(chat_triggers: Vec<&str>, repository: &Arc<dyn ReactionDefinitionRepository>) -> Vec<ReactionDefinition> {
        chat_triggers.iter().map(|trigger| {
            let definition = ReactionDefinition::new_empty(
                ReactionDefinitionId(format!("{}_id", trigger)),
                ReactionTrigger::new_chat(trigger.to_string()).unwrap()
            );
            repository.insert(&definition).unwrap();

            definition
        }).collect()
    }
}