use std::sync::Arc;
use std::fmt::Debug;
use thiserror::Error;
use crate::application::images::dtos::image_dto::ImageDto;
use crate::domain::images::image_repository::{ImageRepository, InsertError};
use crate::domain::images::image_storage::{ImageData, ImageStorage};
use crate::domain::images::image::{Image, ImageId, ImageUrl};

pub struct CreateImageRequest {
    pub id: String,
    pub image: Vec<u8>
}

#[derive(Debug, Error)]
pub enum StoreImageError {
    #[error("{0}")]
    Conflict(String),
    #[error("Storage failure")]
    StorageFail,
    #[error("Bad request")]
    BadRequest,
    #[error("Unexpected error")]
    Unexpected
}

pub fn create_image(request: CreateImageRequest, repo: &Arc<dyn ImageRepository>, storage: &Arc<dyn ImageStorage>) -> Result<ImageDto, StoreImageError> {
    match (ImageId::try_from(request.id.clone()), ImageData::try_from(request.image)) {
        (Ok(id), Ok(image_data)) => {
            let image_url = storage.save(&id, &image_data).map_err(|_| StoreImageError::StorageFail)?;

            save_in_repo(&id, &image_url, repo)
                .or_else(|e| storage.delete(&image_url).map_err(|_| StoreImageError::Unexpected).and(Err(e)))
                .map(|image| image.into())
        },
        _ => Err(StoreImageError::BadRequest)
    }
}

fn save_in_repo(id: &ImageId, url: &ImageUrl, repository: &Arc<dyn ImageRepository>) -> Result<Image, StoreImageError> {
    let image = Image::new(id, url);

    match repository.insert(&image) {
        Ok(_) => Ok(image),
        Err(e) => match e {
            InsertError::Conflict => Err(StoreImageError::Conflict(format!("Image with id {:?} already exists", id))),
            InsertError::Unexpected => Err(StoreImageError::Unexpected)
        }
    }
}

#[cfg(test)]
mod tests {
    use crate::persistence::images::in_memory_image_repository::InMemoryImageRepository;
    use crate::persistence::images::in_memory_image_storage::InMemoryImageStorage;
    use super::*;

    fn fake_image() -> Vec<u8> {
        vec![3]
    }

    fn create_id() -> String {
        "a string".to_string()
    }

    #[test]
    fn store_image_storage_errors_return_storage_fail() {
        let repository: Arc<dyn ImageRepository> = Arc::new(InMemoryImageRepository::new());
        let mut storage = InMemoryImageStorage::new();
        storage.set_error_on_save();
        let storage_arc: Arc<dyn ImageStorage> = Arc::new(storage);

        match create_image(CreateImageRequest { image: fake_image(), id: create_id() }, &repository, &storage_arc) {
            Err(e) => match e {
                StoreImageError::StorageFail => {},
                _ => unreachable!()
            },
            _ => unreachable!()
        }
    }

    #[test]
    fn store_image_empty_image_return_bad_request() {
        let repository: Arc<dyn ImageRepository> = Arc::new(InMemoryImageRepository::new());
        let storage: Arc<dyn ImageStorage> = Arc::new(InMemoryImageStorage::new());

        match create_image(CreateImageRequest { image: vec![], id: create_id() }, &repository, &storage) {
            Err(e) => match e {
                StoreImageError::BadRequest => {},
                _ => unreachable!()
            },
            _ => unreachable!()
        }
    }

    #[test]
    fn store_image_empty_id_return_bad_request() {
        let repository: Arc<dyn ImageRepository> = Arc::new(InMemoryImageRepository::new());
        let storage: Arc<dyn ImageStorage> = Arc::new(InMemoryImageStorage::new());

        match create_image(CreateImageRequest { image: fake_image(), id: String::from("") }, &repository, &storage) {
            Err(e) => match e {
                StoreImageError::BadRequest => {},
                _ => unreachable!()
            },
            _ => unreachable!()
        }
    }

    #[test]
    fn store_image_conflict_return_unexpected_and_image_not_on_fs() {
        let repository: Arc<dyn ImageRepository> = Arc::new(InMemoryImageRepository::new());
        let storage = Arc::new(InMemoryImageStorage::new());
        let image = fake_image();
        let id = create_id();

        create_image(CreateImageRequest { image: image.clone(), id: id.clone() }, &repository, &(storage.clone() as Arc<dyn ImageStorage>)).unwrap();

        match create_image(CreateImageRequest { image, id: id.clone() }, &repository, &(storage.clone() as Arc<dyn ImageStorage>)) {
            Err(e) => match e {
                StoreImageError::Conflict(_) => assert!(!storage.has_images_stored()),
                _ => unreachable!()
            },
            _ => unreachable!()
        }
    }

    #[test]
    fn store_image_save_in_repo_and_store_on_fs() {
        let repository = Arc::new(InMemoryImageRepository::new());
        let storage = Arc::new(InMemoryImageStorage::new());
        let image = fake_image();
        let id = create_id();

        match create_image(CreateImageRequest { image, id: id.clone() }, &(repository.clone() as Arc<dyn ImageRepository>), &(storage.clone() as Arc<dyn ImageStorage>)) {
            Ok(image) => {
                assert_eq!(image.id, id.clone());
                assert!(repository.has(&ImageId(image.id)));
                assert!(storage.has(&ImageUrl(image.url)));
            },
            _ => unreachable!()
        }
    }
}