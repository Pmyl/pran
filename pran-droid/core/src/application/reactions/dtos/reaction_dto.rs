use crate::domain::reactions::reaction::{Reaction, ReactionTrigger};
use std::fmt::Debug;
use rocket::serde::Serialize;
use crate::application::reactions::dtos::reaction_step_dto::ReactionStepDto;

#[derive(Debug, Serialize)]
pub struct ReactionDto {
    pub id: String,
    pub trigger: ReactionTriggerDto,
    pub steps: Vec<ReactionStepDto>
}

impl From<Reaction> for ReactionDto {
    fn from(value: Reaction) -> Self { // TODO: this has to be implemented to correctly map the reaction step dto
        Self { id: value.id.0, trigger: value.trigger.into(), steps: value.steps.into_iter().map(|_| ReactionStepDto {}).collect() }
    }
}

#[derive(Debug, Serialize)]
pub enum ReactionTriggerDto {
    Chat(String)
}

impl From<ReactionTrigger> for ReactionTriggerDto {
    fn from(value: ReactionTrigger) -> Self {
        match value {
            ReactionTrigger::Chat(chat) => ReactionTriggerDto::Chat(chat.text),
        }
    }
}