use crate::domain::reactions::reaction_definition::{ReactionDefinition, ReactionTrigger};
use std::fmt::Debug;
use crate::application::reactions::dtos::reaction_step_dto::{ReactionStepDto};

#[derive(Debug)]
pub struct ReactionDto {
    pub id: String,
    pub is_disabled: bool,
    pub count: u32,
    pub trigger: ReactionTriggerDto,
    pub steps: Vec<ReactionStepDto>
}

impl From<ReactionDefinition> for ReactionDto {
    fn from(value: ReactionDefinition) -> Self {
        Self {
            id: value.id.0,
            is_disabled: value.is_disabled,
            count: value.count,
            trigger: value.triggers.into_iter().next().unwrap().into(),
            steps: value.steps.into_iter().map(From::from).collect()
        }
    }
}

#[derive(Debug)]
pub enum ReactionTriggerDto {
    ChatCommand(String),
    ChatKeyword(String),
}

impl From<ReactionTrigger> for ReactionTriggerDto {
    fn from(value: ReactionTrigger) -> Self {
        match value {
            ReactionTrigger::ChatCommand(chat) => ReactionTriggerDto::ChatCommand(chat.text),
            ReactionTrigger::ChatKeyword(chat) => ReactionTriggerDto::ChatKeyword(chat.text),
        }
    }
}