use std::sync::Arc;
use rocket::serde::Serialize;
use rocket::State;
use rocket::serde::json::Json;
use pran_droid_core::application::emotions::dtos::emotion_dto::EmotionDto;
use pran_droid_core::application::emotions::get_all::get_all_emotions;
use pran_droid_core::domain::emotions::emotion_repository::EmotionRepository;
use crate::emotions::responses::emotion_response::EmotionResponse;

#[derive(Serialize)]
pub struct GetAllEmotionsResponse {
    data: Vec<EmotionResponse>
}

impl From<Vec<EmotionDto>> for GetAllEmotionsResponse {
    fn from(value: Vec<EmotionDto>) -> Self {
        Self { data: value.into_iter().map(From::from).collect() }
    }
}

#[get("/emotions")]
pub fn api_get_all_emotions(repo: &State<Arc<dyn EmotionRepository>>) -> Json<GetAllEmotionsResponse> {
    Json(get_all_emotions(repo).into())
}