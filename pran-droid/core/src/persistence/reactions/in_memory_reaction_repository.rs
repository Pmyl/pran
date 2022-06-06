use std::sync::Mutex;
use crate::domain::reactions::reaction_definition::{ReactionDefinition, ReactionDefinitionId, ReactionTrigger};
use crate::domain::reactions::reaction_definition_repository::{ReactionDefinitionRepository, ReactionInsertError, ReactionUpdateError};

pub struct InMemoryReactionRepository {
    reactions: Mutex<Vec<ReactionDefinition>>,
}

impl InMemoryReactionRepository {
    pub fn new() -> InMemoryReactionRepository {
        InMemoryReactionRepository { reactions: Mutex::new(vec!()) }
    }
}

impl ReactionDefinitionRepository for InMemoryReactionRepository {
    fn next_id(&self) -> ReactionDefinitionId {
        ReactionDefinitionId(uuid::Uuid::new_v4().to_string())
    }

    fn insert(&self, reaction: &ReactionDefinition) -> Result<(), ReactionInsertError> {
        let mut lock = match self.reactions.lock() {
            Ok(lock) => lock,
            Err(_) => return Err(ReactionInsertError::Unexpected)
        };

        if lock.iter().any(|stored_reaction| stored_reaction.id == reaction.id) {
            return Err(ReactionInsertError::Conflict);
        }

        lock.push(reaction.clone());

        Ok(())
    }

    fn exists_with_trigger(&self, trigger: &ReactionTrigger) -> bool {
        let lock = self.reactions.lock().unwrap();

        lock.iter().any(|stored_reaction| &stored_reaction.trigger == trigger)
    }

    fn get(&self, id: &ReactionDefinitionId) -> Option<ReactionDefinition> {
        self.reactions.lock().unwrap().iter().find(|stored_reaction| &stored_reaction.id == id).cloned()
    }

    fn get_all(&self) -> Vec<ReactionDefinition> {
        self.reactions.lock().unwrap().to_vec()
    }

    fn update(&self, reaction: &ReactionDefinition) -> Result<(), ReactionUpdateError> {
        let mut lock = self.reactions.lock().unwrap();
        if let Some(index) = lock.iter().position(|stored_reaction| stored_reaction.id == reaction.id) {
            lock.remove(index);
            lock.push(reaction.clone());

            return Ok(())
        }

        Err(ReactionUpdateError::Missing)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::reactions::reaction_definition::{ReactionDefinitionId};

    impl InMemoryReactionRepository {
        pub fn has(&self, id: &ReactionDefinitionId) -> bool {
            let lock = self.reactions.lock().unwrap();
            lock.iter().any(|image| image.id == *id)
        }
    }
}