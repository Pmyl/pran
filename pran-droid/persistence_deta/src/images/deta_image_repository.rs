use async_trait::async_trait;
use serde::{Serialize, Deserialize};
use pran_droid_core::domain::images::image::{Image, ImageId, ImageUrl};
use crate::deta::{Base, Deta, InsertError as DetaInsertError, QueryAll};
use pran_droid_core::domain::images::image_repository::{ImageRepository, InsertError};

pub struct DetaImageRepository {
    base: Base
}

impl DetaImageRepository {
    pub fn new(project_key: String, project_id: String) -> Self {
        Self { base: Deta::new(project_key, project_id).base("pran_droid_images") }
    }
}

#[derive(Debug, Serialize, Deserialize)]
struct ImageStorage {
    key: String,
    url: String
}

impl Into<Image> for ImageStorage {
    fn into(self) -> Image {
        Image { id: ImageId(self.key), url: ImageUrl(self.url) }
    }
}

impl From<&Image> for ImageStorage {
    fn from(image: &Image) -> Self {
        Self { key: image.id.0.clone(), url: image.url.0.clone() }
    }
}

#[async_trait]
impl ImageRepository for DetaImageRepository {
    async fn get(&self, id: &ImageId) -> Option<Image> {
        self.base.get::<ImageStorage>(id.0.as_str()).await.ok().map(Into::into)
    }

    async fn get_all(&self) -> Vec<Image> {
        self.base.query_all::<ImageStorage>(QueryAll::default()).await
            .expect("Unexpected error")
            .into_iter()
            .map(Into::into)
            .collect()
    }

    async fn has(&self, id: &ImageId) -> bool {
        self.base.get::<ImageStorage>(id.0.as_str()).await.ok().is_some()
    }

    async fn insert(&self, image: &Image) -> Result<(), InsertError> {
        self.base.insert::<ImageStorage>(image.into()).await
            .map_err(|error| match error {
                DetaInsertError::Unexpected(_) => InsertError::Unexpected,
                DetaInsertError::Conflict => InsertError::Conflict,
                DetaInsertError::BadRequest(_) => InsertError::Unexpected
            })
            .map(|_| ())
    }
}