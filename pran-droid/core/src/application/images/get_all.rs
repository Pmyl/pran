
use crate::application::images::dtos::image_dto::ImageDto;
use crate::domain::images::image_repository::ImageRepository;

pub async fn get_all_images(repo: &dyn ImageRepository) -> Vec<ImageDto> {
    repo.get_all().await.into_iter().map(From::from).collect()
}