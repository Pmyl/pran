use async_trait::async_trait;
use std::clone::Clone;
use std::fmt::Debug;
use std::marker::{Send, Sync};
use thiserror::Error;
use crate::domain::images::image::{ImageId, ImageUrl};

#[derive(Debug, Clone)]
pub struct ImageData(pub Vec<u8>);

impl TryFrom<Vec<u8>> for ImageData {
    type Error = ();

    fn try_from(value: Vec<u8>) -> Result<Self, Self::Error> {
        if value.is_empty() {
            return Err(());
        }
        Ok(ImageData(value))
    }
}

#[derive(Error, Debug)]
pub enum StorageSaveError {
    #[error("Unexpected error while saving the image on fs")]
    Unexpected
}

#[derive(Error, Debug)]
pub enum StorageDeleteError {
    #[error("The image does not exists on fs")]
    Missing,
    #[error("Unexpected error while deleting image")]
    Unexpected
}

#[async_trait]
pub trait ImageStorage: Send + Sync {
    async fn get(&self, url: &ImageUrl) -> Option<ImageData>;
    async fn save(&self, id: &ImageId, data: &ImageData) -> Result<ImageUrl, StorageSaveError>;
    async fn delete(&self, url: &ImageUrl) -> Result<(), StorageDeleteError>;
}
