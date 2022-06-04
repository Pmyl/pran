use std::sync::Arc;
use crate::application::emotions::dtos::emotion_dto::EmotionDto;
use crate::domain::emotions::emotion::{EmotionId};
use crate::domain::emotions::emotion_repository::EmotionRepository;

pub struct GetEmotionRequest {
    pub id: String
}

pub fn get_emotion(request: GetEmotionRequest, repository: &Arc<dyn EmotionRepository>) -> Option<EmotionDto> {
    repository.get(&EmotionId(request.id)).map(From::from)
}
