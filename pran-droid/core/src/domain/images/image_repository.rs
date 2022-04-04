use crate::domain::images::image::{Image};
use std::marker::{Send, Sync};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum InsertError {
    #[error("Trying to insert duplicate image id")]
    Conflict,
    #[error("Unexpected error")]
    Unexpected
}

pub trait ImageRepository: Send + Sync {
    fn get_all(&self) -> Vec<Image>;
    fn insert(&self, image: &Image) -> Result<(), InsertError>;
}
