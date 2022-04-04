use std::error::Error;
use std::sync::Mutex;
use crate::domain::reactions::reaction::{Reaction, ReactionId, ReactionTrigger};
use crate::domain::reactions::reaction_repository::{ReactionRepository, ReactionInsertError, ReactionUpdateError};

pub struct InMemoryReactionRepository {
    reactions: Mutex<Vec<Reaction>>,
}

impl InMemoryReactionRepository {
    pub fn new() -> InMemoryReactionRepository {
        InMemoryReactionRepository { reactions: Mutex::new(vec!()) }
    }
}

impl ReactionRepository for InMemoryReactionRepository {
    fn next_id(&self) -> ReactionId {
        ReactionId(uuid::Uuid::new_v4().to_string())
    }

    fn insert(&self, reaction: &Reaction) -> Result<(), ReactionInsertError> {
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
        let mut lock = self.reactions.lock().unwrap();

        lock.iter().any(|stored_reaction| &stored_reaction.trigger == trigger)
    }

    fn get(&self, id: &ReactionId) -> Option<Reaction> {
        self.reactions.lock().unwrap().iter().find(|stored_reaction| &stored_reaction.id == id).cloned()
    }

    fn update(&self, reaction: &Reaction) -> Result<(), ReactionUpdateError> {
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
    use crate::domain::reactions::reaction::{ReactionId};

    impl InMemoryReactionRepository {
        pub fn has(&self, id: &ReactionId) -> bool {
            let lock = self.reactions.lock().unwrap();
            lock.iter().any(|image| image.id == *id)
        }
    }
}