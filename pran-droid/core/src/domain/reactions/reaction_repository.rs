use std::fmt::Debug;
use thiserror::Error;
use crate::domain::reactions::reaction::{Reaction, ReactionId, ReactionTrigger};

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

pub trait ReactionRepository: Send + Sync {
    fn next_id(&self) -> ReactionId;
    fn insert(&self, reaction: &Reaction) -> Result<(), ReactionInsertError>;
    fn exists_with_trigger(&self, trigger: &ReactionTrigger) -> bool;
    fn get(&self, id: &ReactionId) -> Option<Reaction>;
    fn get_all(&self) -> Vec<Reaction>;
    fn update(&self, reaction: &Reaction) -> Result<(), ReactionUpdateError>;
}
