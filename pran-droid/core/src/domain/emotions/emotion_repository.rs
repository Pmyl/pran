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
    fn get(&self, id: &EmotionId) -> Option<Emotion>;
    fn get_all(&self) -> Vec<Emotion>;
    fn exists(&self, id: &EmotionId) -> bool;
    fn get_by_name(&self, name: &EmotionName) -> Option<Emotion>;
    fn exists_with_name(&self, name: &EmotionName) -> bool;
}

#[cfg(test)]
pub mod tests {
    use std::sync::Arc;
    use super::*;

    pub fn setup_dummy_emotion(repository: &Arc<dyn EmotionRepository>) -> Emotion {
        let id = String::from("happy");
        let emotion = Emotion::new_empty(EmotionId(id.clone()), EmotionName(format!("{}_name", id.clone())));
        repository.insert(&emotion).unwrap();

        emotion
    }

    pub fn setup_dummy_emotions(ids: Vec<&str>, repository: &Arc<dyn EmotionRepository>) {
        for id in ids {
            let emotion = Emotion::new_empty(EmotionId(id.to_string()), EmotionName(format!("{}_name", id.to_string())));
            repository.insert(&emotion).unwrap();
        }
    }
}