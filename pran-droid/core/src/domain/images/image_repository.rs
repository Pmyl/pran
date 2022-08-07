use async_trait::async_trait;
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

#[async_trait]
pub trait ImageRepository: Send + Sync {
    async fn get(&self, id: &ImageId) -> Option<Image>;
    async fn get_all(&self) -> Vec<Image>;
    async fn has(&self, id: &ImageId) -> bool;
    async fn insert(&self, image: &Image) -> Result<(), InsertError>;
}

#[cfg(test)]
pub mod tests {
    use std::sync::Arc;
    use crate::domain::images::image::ImageUrl;
    use super::*;

    pub async fn setup_dummy_images(ids: Vec<&str>, repository: &dyn ImageRepository) {
        for id in ids {
            repository.insert(&
                Image {
                    id: ImageId(id.to_string()),
                    url: ImageUrl(String::from("a url"))
                }).await.unwrap();
        }
    }
}