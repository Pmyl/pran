use std::fmt::Debug;
use std::clone::Clone;
use std::cmp::PartialEq;
use crate::domain::emotions::emotion::EmotionId;
use crate::domain::reactions::reaction::{MovingReactionStep, ReactionStepSkip, ReactionStepText};

#[derive(Clone, Debug)]
pub struct ReactionDefinition {
    pub id: ReactionDefinitionId,
    pub trigger: ReactionTrigger,
    pub steps: Vec<ReactionStepDefinition>
}

#[derive(Clone, Debug, PartialEq)]
pub struct ReactionDefinitionId(pub String);

#[derive(Debug, Clone, PartialEq)]
pub enum ReactionTrigger {
    Chat(ChatTrigger)
}

#[derive(Debug, Clone, PartialEq)]
pub struct ChatTrigger {
    pub text: String
}

impl ChatTrigger {
    pub fn matches(&self, message_text: &str) -> bool {
        message_text.contains(&self.text)
    }
}

impl ReactionDefinition {
    pub(crate) fn new_empty(id: ReactionDefinitionId, trigger: ReactionTrigger) -> Self {
        Self {
            id,
            trigger,
            steps: vec![]
        }
    }

    pub(super) fn add_step(&mut self, step: ReactionStepDefinition) {
        self.steps.push(step);
    }

    pub(super) fn replace_step_at(&mut self, step: ReactionStepDefinition, index: usize) {
        self.steps.remove(index);
        self.steps.insert(index, step);
    }
}

impl ReactionTrigger {
    pub(crate) fn new_chat(trigger: String) -> Result<Self, ()> {
        if trigger.is_empty() {
            return Err(());
        }

        Ok(ReactionTrigger::Chat(ChatTrigger { text: trigger }))
    }
}

#[derive(Clone, Debug)]
pub enum ReactionStepDefinition {
    Moving(MovingReactionStep),
    Talking(TalkingReactionStepDefinition),
    CompositeTalking(Vec<TalkingReactionStepDefinition>)
}

pub type MovingReactionStepDefinition = MovingReactionStep;

#[derive(Clone, Debug)]
pub struct TalkingReactionStepDefinition {
    pub emotion_id: EmotionId,
    pub skip: ReactionStepSkipDefinition,
    pub text: ReactionStepTextDefinition
}

pub type ReactionStepSkipDefinition = ReactionStepSkip;
pub type ReactionStepTextDefinition = ReactionStepText;

impl ReactionStepTextDefinition {
    pub fn get_text(&self) -> String {
        match self {
            ReactionStepTextDefinition::Instant(text) => text.clone(),
            ReactionStepTextDefinition::LetterByLetter(text) => text.clone()
        }
    }
}