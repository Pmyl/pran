use std::sync::Arc;
use rocket::serde::Serialize;
use rocket::State;
use rocket::serde::json::Json;
use crate::application::images::dtos::image_dto::ImageDto;
use crate::application::images::get_all::get_all_images;
use crate::domain::images::image_repository::ImageRepository;

#[derive(Serialize)]
pub struct GetAllImagesResponse {
    data: Vec<ImageDto>
}

impl From<Vec<ImageDto>> for GetAllImagesResponse {
    fn from(value: Vec<ImageDto>) -> Self {
        Self { data: value.into_iter().map(From::from).collect() }
    }
}

#[get("/images")]
pub fn api_get_all_images(repo: &State<Arc<dyn ImageRepository>>) -> Json<GetAllImagesResponse> {
    Json(get_all_images(repo.clone()).into())
}