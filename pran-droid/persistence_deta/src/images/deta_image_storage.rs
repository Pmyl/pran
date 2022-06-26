use async_trait::async_trait;
use pran_droid_core::domain::images::image::{ImageId, ImageUrl};
use crate::deta::{Drive, Deta, DriveFile, PutError, DeleteError};
use pran_droid_core::domain::images::image_storage::{ImageData, ImageStorage, StorageDeleteError, StorageSaveError};

pub struct DetaImageStorage {
    drive: Drive
}

impl DetaImageStorage {
    pub fn new(project_key: String, project_id: String) -> Self {
        Self { drive: Deta::new(project_key, project_id).drive("pran_droid_images") }
    }
}

#[async_trait]
impl ImageStorage for DetaImageStorage {
    async fn get(&self, url: &ImageUrl) -> Option<ImageData> {
        self.drive.download(url.0.clone()).await.map(|bytes| ImageData(bytes)).ok()
    }

    async fn save(&self, id: &ImageId, data: &ImageData) -> Result<ImageUrl, StorageSaveError> {
        let url = format!("api/images/{}", id.0.clone());
        self.drive.put(data.0.clone(), url.clone(), DriveFile::Png).await
            .map(|_| ImageUrl(url))
            .map_err(|error| match error {
                PutError::Unexpected(_) => StorageSaveError::Unexpected,
                PutError::BadRequest(_) => StorageSaveError::Unexpected
            })
    }

    async fn delete(&self, url: &ImageUrl) -> Result<(), StorageDeleteError> {
        self.drive.delete(vec![url.0.clone()]).await
            .map_err(|error| match error {
                DeleteError::Unexpected(_) => StorageDeleteError::Unexpected
            })
    }
}