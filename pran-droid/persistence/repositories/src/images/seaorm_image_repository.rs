use std::sync::Arc;
use async_trait::async_trait;
use sea_orm::{entity::*};
use pran_droid_core::domain::images::image::{Image, ImageId, ImageUrl};
use pran_droid_core::domain::images::image_repository::{ImageRepository, InsertError};
use pran_droid_persistence_entities::images::image::Entity as ImageEntity;
use pran_droid_persistence_entities::images::image::Model as ImageModel;
use pran_droid_persistence_entities::images::image::ActiveModel as ImageActiveModel;
use crate::connectors::connector::SeaOrmDatabaseConnector;

fn into_table(image: &Image) -> ImageModel {
    ImageModel { id: image.id.0.clone(), url: image.url.0.clone() }
}

fn into_domain_model(model: ImageModel) -> Image {
    Image { id: ImageId(model.id), url: ImageUrl(model.url) }
}

pub struct SeaOrmImageRepository {
    pub connector: Arc<dyn SeaOrmDatabaseConnector>
}

#[async_trait]
impl ImageRepository for SeaOrmImageRepository {
    async fn get(&self, id: &ImageId) -> Option<Image> {
        ImageEntity::find_by_id(id.0.clone()).one(&self.connector.connect().await).await.unwrap().map(into_domain_model)
    }

    async fn get_all(&self) -> Vec<Image> {
        ImageEntity::find().all(&self.connector.connect().await).await.unwrap().into_iter().map(into_domain_model).collect()
    }

    async fn has(&self, id: &ImageId) -> bool {
        ImageEntity::find_by_id(id.0.clone()).one(&self.connector.connect().await).await.unwrap().is_some()
    }

    async fn insert(&self, image: &Image) -> Result<(), InsertError> {
        let model = into_table(image);
        let active_model = Into::<ImageActiveModel>::into(model);

        ImageEntity::insert(active_model).exec(&self.connector.connect().await).await
            .map_err(|error| if error.to_string().to_lowercase().contains("unique") { InsertError::Conflict } else { InsertError::Unexpected })
            .map(|_| ())
    }
}