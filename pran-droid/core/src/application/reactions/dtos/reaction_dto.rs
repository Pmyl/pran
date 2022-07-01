use crate::domain::reactions::reaction_definition::{ReactionDefinition, ReactionTrigger};
use std::fmt::Debug;
use crate::application::reactions::dtos::reaction_step_dto::{ReactionStepDto};

#[derive(Debug)]
pub struct ReactionDto {
    pub id: String,
    pub is_disabled: bool,
    pub count: u32,
    pub triggers: Vec<ReactionTriggerDto>,
    pub steps: Vec<ReactionStepDto>,
}

impl From<ReactionDefinition> for ReactionDto {
    fn from(value: ReactionDefinition) -> Self {
        Self {
            id: value.id.0,
            is_disabled: value.is_disabled,
            count: value.count,
            triggers: value.triggers.into_iter().map(From::from).collect(),
            steps: value.steps.into_iter().map(From::from).collect(),
        }
    }
}

#[derive(Clone, Debug)]
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

impl TryInto<ReactionTrigger> for ReactionTriggerDto {
    type Error = ();
    fn try_into(self) -> Result<ReactionTrigger, Self::Error> {
        match self {
            ReactionTriggerDto::ChatCommand(text) => ReactionTrigger::new_chat_command(text),
            ReactionTriggerDto::ChatKeyword(text) => ReactionTrigger::new_chat_keyword(text),
        }
    }
}