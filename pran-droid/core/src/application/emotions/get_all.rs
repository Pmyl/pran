use std::sync::Arc;
use crate::application::emotions::dtos::emotion_dto::EmotionDto;
use crate::domain::emotions::emotion_repository::EmotionRepository;

pub async fn get_all_emotions(repository: &Arc<dyn EmotionRepository>) -> Vec<EmotionDto> {
    repository.get_all().await.into_iter().map(From::from).collect()
}
