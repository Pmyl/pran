use crate::domain::images::image::{Image, ImageId};
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
    fn get(&self, id: &ImageId) -> Option<Image>;
    fn get_all(&self) -> Vec<Image>;
    fn has(&self, id: &ImageId) -> bool;
    fn insert(&self, image: &Image) -> Result<(), InsertError>;
}

#[cfg(test)]
pub mod tests {
    use std::sync::Arc;
    use crate::domain::images::image::ImageUrl;
    use super::*;

    pub fn setup_dummy_images(ids: Vec<&str>, repository: &Arc<dyn ImageRepository>) {
        for id in ids {
            repository.insert(&
                Image {
                    id: ImageId(id.to_string()),
                    url: ImageUrl(String::from("a url"))
                }).unwrap();
        }
    }
}