use crate::domain::animations::animation::Animation;
use std::fmt::Debug;
use thiserror::Error;

// TODO: remove this? Still undecided if it's an aggregate or not, currently leaning towards it being just an entity

#[derive(Debug, Error)]
pub enum AnimationInsertError {
    #[error("Unexpected error while inserting the animation")]
    Unexpected,
    #[error("Trying to insert an animation with existing id")]
    Conflict
}

pub trait AnimationRepository {
    fn insert(&self, animation: &Animation) -> Result<(), AnimationInsertError>;
}
