use std::sync::Arc;
use rocket::serde::Serialize;
use rocket::State;
use rocket::serde::json::Json;
use pran_droid_core::application::images::dtos::image_dto::ImageDto;
use pran_droid_core::application::images::get_all::get_all_images;
use pran_droid_core::domain::images::image_repository::ImageRepository;
use crate::infrastructure::authenticated::AuthenticatedReadOnly;
use crate::images::responses::image_response::ImageResponse;

#[derive(Serialize)]
pub struct GetAllImagesResponse {
    data: Vec<ImageResponse>
}

impl From<Vec<ImageDto>> for GetAllImagesResponse {
    fn from(value: Vec<ImageDto>) -> Self {
        Self { data: value.into_iter().map(From::from).collect() }
    }
}

#[get("/images")]
pub async fn api_get_all_images(_authenticated: AuthenticatedReadOnly, repo: &State<Arc<dyn ImageRepository>>) -> Json<GetAllImagesResponse> {
    Json(get_all_images(repo).await.into())
}