use thiserror::Error;
use crate::domain::emotions::emotion::{Emotion, EmotionId, EmotionName};

#[derive(Debug, Error)]
pub enum EmotionInsertError {
    #[error("Unexpected error while inserting the emotion")]
    Unexpected,
    #[error("Trying to insert an emotion with existing id")]
    Conflict
}

#[derive(Debug, Error)]
pub enum EmotionUpdateError {
    #[error("Trying to update a not existing emotion")]
    Missing
}

pub trait EmotionRepository: Send + Sync {
    fn next_id(&self) -> EmotionId;
    fn insert(&self, emotion: &Emotion) -> Result<(), EmotionInsertError>;
    fn update(&self, emotion: &Emotion) -> Result<(), EmotionUpdateError>;
    fn get(&self, name: &EmotionId) -> Option<Emotion>;
    fn get_by_name(&self, name: &EmotionName) -> Option<Emotion>;
    fn exists_with_name(&self, name: &EmotionName) -> bool;
}
