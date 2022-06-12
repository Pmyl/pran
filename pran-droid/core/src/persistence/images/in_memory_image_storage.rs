use std::collections::HashMap;
use std::sync::Mutex;
use crate::domain::images::image::{ImageId, ImageUrl};
use crate::domain::images::image_storage::{ImageData, ImageStorage, StorageDeleteError, StorageSaveError};

pub struct InMemoryImageStorage {
    file_system: Mutex<HashMap<String, ImageData>>,
    error_on_save: bool,
}

impl InMemoryImageStorage {
    pub fn new() -> InMemoryImageStorage {
        InMemoryImageStorage { file_system: Mutex::new(HashMap::new()), error_on_save: false }
    }
}

impl ImageStorage for InMemoryImageStorage {
    fn get(&self, url: &ImageUrl) -> Option<ImageData> {
        let lock = match self.file_system.lock() {
            Ok(lock) => lock,
            _ => return None,
        };
        lock.get(&url.0.clone()).cloned()
    }

    fn save(&self, id: &ImageId, data: &ImageData) -> Result<ImageUrl, StorageSaveError> {
        if self.error_on_save {
            return Err(StorageSaveError::Unexpected);
        }
        let mut url = format!("api/images/{}", id.0.clone());

        let mut lock = match self.file_system.lock() {
            Ok(lock) => lock,
            _ => return Err(StorageSaveError::Unexpected),
        };
        while lock.contains_key(&url) {
            url = format!("{}0", url);
        }
        lock.insert(url.clone(), data.clone());

        Ok(ImageUrl(url))
    }

    fn delete(&self, url: &ImageUrl) -> Result<(), StorageDeleteError> {
        let mut lock = match self.file_system.lock() {
            Ok(lock) => lock,
            _ => return Err(StorageDeleteError::Unexpected),
        };

        if !lock.contains_key(&url.0) {
            return Err(StorageDeleteError::Missing);
        }

        lock.remove(&url.0);

        Ok(())
    }
}


#[cfg(test)]
impl InMemoryImageStorage {
    pub fn set_error_on_save(&mut self) {
        self.error_on_save = true;
    }

    pub fn files_count(&self) -> usize {
        self.file_system.lock().unwrap().len()
    }

    pub fn has(&self, url: &ImageUrl) -> bool {
        self.file_system.lock().unwrap().contains_key(&url.0)
    }
}