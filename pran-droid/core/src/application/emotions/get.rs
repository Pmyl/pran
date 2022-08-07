use crate::application::emotions::dtos::emotion_dto::EmotionDto;
use crate::domain::emotions::emotion::{EmotionId};
use crate::domain::emotions::emotion_repository::EmotionRepository;

pub struct GetEmotionRequest {
    pub id: String
}

pub async fn get_emotion(request: GetEmotionRequest, repository: &dyn EmotionRepository) -> Option<EmotionDto> {
    repository.get(&EmotionId(request.id)).await.map(From::from)
}
