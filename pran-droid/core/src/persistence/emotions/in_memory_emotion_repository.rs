use async_trait::async_trait;
use std::sync::{Arc, Mutex};
use crate::domain::emotions::emotion::{Emotion, EmotionId, EmotionName};
use crate::domain::emotions::emotion_repository::{EmotionInsertError, EmotionRepository, EmotionUpdateError};
use crate::persistence::id_generation::id_generation::{IdGenerator, IdGeneratorInMemoryIncremental, IdGeneratorUuid};

pub struct InMemoryEmotionRepository {
    emotions: Mutex<Vec<Emotion>>,
    id_generator: Arc<Mutex<dyn IdGenerator>>,
}

impl InMemoryEmotionRepository {
    pub fn new() -> InMemoryEmotionRepository {
        InMemoryEmotionRepository { emotions: Mutex::new(vec!()), id_generator: Arc::new(Mutex::new(IdGeneratorUuid::new())) }
    }

    pub fn new_with_id_deterministic() -> InMemoryEmotionRepository {
        InMemoryEmotionRepository { emotions: Mutex::new(vec!()), id_generator: Arc::new(Mutex::new(IdGeneratorInMemoryIncremental::new())) }
    }
}

#[async_trait]
impl EmotionRepository for InMemoryEmotionRepository {
    fn next_id(&self) -> EmotionId {
        EmotionId(self.id_generator.lock().unwrap().next_id())
    }

    async fn insert(&self, emotion: &Emotion) -> Result<(), EmotionInsertError> {
        let mut lock = match self.emotions.lock() {
            Ok(lock) => lock,
            Err(_) => return Err(EmotionInsertError::Unexpected("Can't get hold of the in memory storage".to_string()))
        };

        if lock.iter().any(|stored_emotion| stored_emotion.id == emotion.id) {
            return Err(EmotionInsertError::Conflict);
        }

        lock.push(emotion.clone());

        Ok(())
    }

    async fn update(&self, emotion: &Emotion) -> Result<(), EmotionUpdateError> {
        let mut lock = self.emotions.lock().unwrap();
        if let Some(index) = lock.iter().position(|stored_emotion| stored_emotion.id == emotion.id) {
            lock.remove(index);
            lock.push(emotion.clone());

            return Ok(())
        }

        Err(EmotionUpdateError::Missing)
    }

    async fn get(&self, id: &EmotionId) -> Option<Emotion> {
        self.emotions.lock().unwrap().iter().find(|stored_emotion| &stored_emotion.id == id).cloned()
    }

    async fn get_all(&self) -> Vec<Emotion> {
        self.emotions.lock().unwrap().to_vec()
    }

    async fn exists(&self, id: &EmotionId) -> bool {
        self.emotions.lock().unwrap().iter().any(|stored_emotion| &stored_emotion.id == id)
    }

    async fn get_by_name(&self, name: &EmotionName) -> Option<Emotion> {
        self.emotions.lock().unwrap().iter().find(|stored_emotion| &stored_emotion.name == name).cloned()
    }

    async fn exists_with_name(&self, name: &EmotionName) -> bool {
        self.emotions.lock().unwrap().iter().any(|stored_emotion| &stored_emotion.name == name)
    }
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;
    use crate::domain::emotions::emotion::{EmotionLayer, MouthLayerId};
    use super::*;

    impl InMemoryEmotionRepository {
        pub fn create_dummy_emotion(id: String) -> Emotion {
            Emotion {
                id: EmotionId(id),
                name: EmotionName(String::from("a name")),
                animation: vec![EmotionLayer::Mouth { id: MouthLayerId, parent_id: None, mouth_mapping: HashMap::new() }],
            }
        }
    }
}