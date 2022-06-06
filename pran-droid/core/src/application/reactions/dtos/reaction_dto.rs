use crate::domain::reactions::reaction_definition::{ReactionDefinition, ReactionTrigger};
use std::fmt::Debug;
use crate::application::reactions::dtos::reaction_step_dto::{ReactionStepDto};

#[derive(Debug)]
pub struct ReactionDto {
    pub id: String,
    pub trigger: ReactionTriggerDto,
    pub steps: Vec<ReactionStepDto>
}

impl From<ReactionDefinition> for ReactionDto {
    fn from(value: ReactionDefinition) -> Self {
        Self { id: value.id.0, trigger: value.trigger.into(), steps: value.steps.into_iter().map(From::from).collect() }
    }
}

#[derive(Debug)]
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