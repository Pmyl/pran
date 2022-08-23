use rocket::serde::Serialize;
use pran_droid_core::application::reactions::dtos::reaction_dto::{ReactionDto, ReactionTriggerDto};
use crate::reactions::models::reaction_step_model::{ReactionStepModel, ReactionTriggerModel};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReactionResponse {
    id: String,
    steps: Vec<ReactionStepModel>,
    is_disabled: bool,
    count: u32,
    triggers: Vec<ReactionTriggerModel>
}

impl From<ReactionDto> for ReactionResponse {
    fn from(dto: ReactionDto) -> ReactionResponse {
        ReactionResponse {
            id: dto.id,
            triggers: dto.triggers.into_iter().map(Into::into).collect(),
            is_disabled: dto.is_disabled,
            count: dto.count,
            steps: dto.steps.into_iter().map(From::from).collect()
        }
    }
}

impl Into<ReactionTriggerModel> for ReactionTriggerDto {
    fn into(self) -> ReactionTriggerModel {
        match self {
            ReactionTriggerDto::ChatCommand(chat_trigger) => ReactionTriggerModel::ChatCommand { command: chat_trigger },
            ReactionTriggerDto::ChatKeyword(chat_trigger) => ReactionTriggerModel::ChatKeyword { keyword: chat_trigger },
            ReactionTriggerDto::Action(id, name) => ReactionTriggerModel::Action { id, name },
        }
    }
}

impl Into<ReactionTriggerDto> for ReactionTriggerModel {
    fn into(self) -> ReactionTriggerDto {
        match self {
            ReactionTriggerModel::ChatCommand { command: chat_trigger } => ReactionTriggerDto::ChatCommand(chat_trigger),
            ReactionTriggerModel::ChatKeyword { keyword: chat_trigger } => ReactionTriggerDto::ChatKeyword(chat_trigger),
            ReactionTriggerModel::Action { id, name } => ReactionTriggerDto::Action(id, name),
        }
    }
}
