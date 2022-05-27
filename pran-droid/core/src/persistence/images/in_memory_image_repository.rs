use std::sync::Mutex;
use crate::domain::images::image::{Image, ImageId};
use crate::domain::images::image_repository::{ImageRepository, InsertError};

pub struct InMemoryImageRepository {
    images: Mutex<Vec<Image>>,
}

impl InMemoryImageRepository {
    pub fn new() -> InMemoryImageRepository {
        InMemoryImageRepository { images: Mutex::new(vec!()) }
    }
}

impl ImageRepository for InMemoryImageRepository {
    fn get_all(&self) -> Vec<Image> {
        self.images.lock().unwrap().to_vec()
    }

    fn has(&self, id: &ImageId) -> bool {
        let lock = self.images.lock().unwrap();
        lock.iter().any(|image| image.id == *id)
    }

    fn insert(&self, image: &Image) -> Result<(), InsertError> {
        let mut lock = match self.images.lock() {
            Ok(lock) => lock,
            Err(_) => return Err(InsertError::Unexpected)
        };

        if lock.iter().any(|stored_image| stored_image.id == image.id) {
            return Err(InsertError::Conflict);
        }

        lock.push(image.clone());

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::images::image::{ImageId, ImageUrl};

    impl InMemoryImageRepository {
        pub fn create_dummy_image(id: String) -> Image {
            Image {
                id: ImageId(id),
                url: ImageUrl(String::from("a url"))
            }
        }
    }
}