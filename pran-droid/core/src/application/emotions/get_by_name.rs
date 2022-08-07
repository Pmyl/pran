
use crate::application::emotions::dtos::emotion_dto::EmotionDto;
use crate::domain::emotions::emotion::EmotionName;
use crate::domain::emotions::emotion_repository::EmotionRepository;

pub struct GetEmotionByNameRequest {
    pub name: String
}

pub async fn get_emotion_by_name(request: GetEmotionByNameRequest, repository: &dyn EmotionRepository) -> Option<EmotionDto> {
    repository.get_by_name(&EmotionName(request.name)).await.map(From::from)
}
