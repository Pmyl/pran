use rocket::serde::Serialize;
use pran_droid_core::application::reactions::dtos::reaction_dto::{ReactionDto, ReactionTriggerDto};
use crate::reactions::models::reaction_step_model::ReactionStepModel;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReactionResponse {
    id: String,
    steps: Vec<ReactionStepModel>,
    is_disabled: bool,
    count: u32,
    trigger: String
}

impl From<ReactionDto> for ReactionResponse {
    fn from(dto: ReactionDto) -> ReactionResponse {
        ReactionResponse {
            id: dto.id,
            trigger: trigger_to_string(dto.trigger),
            is_disabled: dto.is_disabled,
            count: dto.count,
            steps: dto.steps.into_iter().map(From::from).collect()
        }
    }
}

fn trigger_to_string(trigger: ReactionTriggerDto) -> String {
    match trigger {
        ReactionTriggerDto::ChatCommand(chat_trigger) => chat_trigger,
        ReactionTriggerDto::ChatKeyword(chat_trigger) => chat_trigger,
    }
}
