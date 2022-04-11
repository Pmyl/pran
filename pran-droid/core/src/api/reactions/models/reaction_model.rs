use rocket::serde::Serialize;
use crate::api::reactions::models::reaction_step_model::ReactionStepModel;
use crate::application::reactions::dtos::reaction_dto::{ReactionDto, ReactionTriggerDto};

#[derive(Serialize)]
pub struct ReactionResponse {
    id: String,
    steps: Vec<ReactionStepModel>,
    trigger: String
}

impl From<ReactionDto> for ReactionResponse {
    fn from(dto: ReactionDto) -> ReactionResponse {
        ReactionResponse {
            id: dto.id,
            trigger: trigger_to_string(dto.trigger),
            steps: dto.steps.into_iter().map(From::from).collect()
        }
    }
}

fn trigger_to_string(trigger: ReactionTriggerDto) -> String {
    match trigger {
        ReactionTriggerDto::Chat(chat_trigger) => chat_trigger
    }
}
