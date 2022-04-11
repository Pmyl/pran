use std::sync::Mutex;
use crate::domain::animations::animation::{Animation};
use crate::domain::animations::animation_repository::{AnimationRepository, AnimationInsertError};

pub struct InMemoryAnimationRepository {
    animations: Mutex<Vec<Animation>>,
}

impl InMemoryAnimationRepository {
    pub fn new() -> InMemoryAnimationRepository {
        InMemoryAnimationRepository { animations: Mutex::new(vec!()) }
    }
}

impl AnimationRepository for InMemoryAnimationRepository {
    fn insert(&self, animation: &Animation) -> Result<(), AnimationInsertError> {
        let mut lock = match self.animations.lock() {
            Ok(lock) => lock,
            Err(_) => return Err(AnimationInsertError::Unexpected)
        };

        // if lock.iter().any(|stored_animation| stored_animation.id == animation.id) {
        //     return Err(AnimationInsertError::Conflict);
        // }

        lock.push(animation.clone());

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // impl InMemoryAnimationRepository {
    //     pub fn has(&self, id: &AnimationId) -> bool {
    //         let lock = self.animations.lock().unwrap();
    //         lock.iter().any(|image| image.id == *id)
    //     }
    // }
}