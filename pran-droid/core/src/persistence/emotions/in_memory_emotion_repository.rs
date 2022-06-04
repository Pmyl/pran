use std::sync::Mutex;
use crate::domain::emotions::emotion::{Emotion, EmotionId, EmotionName};
use crate::domain::emotions::emotion_repository::{EmotionInsertError, EmotionRepository, EmotionUpdateError};

pub struct InMemoryEmotionRepository {
    emotions: Mutex<Vec<Emotion>>,
}

impl InMemoryEmotionRepository {
    pub fn new() -> InMemoryEmotionRepository {
        InMemoryEmotionRepository { emotions: Mutex::new(vec!()) }
    }
}

impl EmotionRepository for InMemoryEmotionRepository {
    fn next_id(&self) -> EmotionId {
        EmotionId(uuid::Uuid::new_v4().to_string())
    }

    fn insert(&self, emotion: &Emotion) -> Result<(), EmotionInsertError> {
        let mut lock = match self.emotions.lock() {
            Ok(lock) => lock,
            Err(_) => return Err(EmotionInsertError::Unexpected)
        };

        if lock.iter().any(|stored_emotion| stored_emotion.id == emotion.id) {
            return Err(EmotionInsertError::Conflict);
        }

        lock.push(emotion.clone());

        Ok(())
    }

    fn update(&self, emotion: &Emotion) -> Result<(), EmotionUpdateError> {
        let mut lock = self.emotions.lock().unwrap();
        if let Some(index) = lock.iter().position(|stored_emotion| stored_emotion.id == emotion.id) {
            lock.remove(index);
            lock.push(emotion.clone());

            return Ok(())
        }

        Err(EmotionUpdateError::Missing)
    }

    fn get(&self, id: &EmotionId) -> Option<Emotion> {
        self.emotions.lock().unwrap().iter().find(|stored_emotion| &stored_emotion.id == id).cloned()
    }

    fn get_by_name(&self, name: &EmotionName) -> Option<Emotion> {
        self.emotions.lock().unwrap().iter().find(|stored_emotion| &stored_emotion.name == name).cloned()
    }

    fn exists_with_name(&self, name: &EmotionName) -> bool {
        self.emotions.lock().unwrap().iter().any(|stored_emotion| &stored_emotion.name == name)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    impl InMemoryEmotionRepository {
        pub fn has(&self, id: &EmotionId) -> bool {
            let lock = self.emotions.lock().unwrap();
            lock.iter().any(|image| image.id == *id)
        }
    }
}