use std::fmt::Debug;
use std::clone::Clone;
use std::cmp::PartialEq;
use crate::domain::brain::stimuli::Stimulus;
use crate::domain::emotions::emotion::EmotionId;
use crate::domain::reactions::reaction::{MovingReactionStep, ReactionStepSkip, ReactionStepText};

#[derive(Clone, Debug)]
pub struct ReactionDefinition {
    pub id: ReactionDefinitionId,
    pub triggers: Vec<ReactionTrigger>,
    pub steps: Vec<ReactionStepDefinition>
}

#[derive(Clone, Debug, PartialEq)]
pub struct ReactionDefinitionId(pub String);

#[derive(Debug, Clone, PartialEq)]
pub enum ReactionTrigger {
    ChatCommand(ChatCommandTrigger)
}

#[derive(Debug, Clone, PartialEq)]
pub struct ChatCommandTrigger {
    pub text: String
}

impl ChatCommandTrigger {
    pub fn matches(&self, message_text: &str) -> bool {
        message_text.contains(&self.text)
    }
}

impl ReactionDefinition {
    pub(crate) fn new_empty(id: ReactionDefinitionId, trigger: ReactionTrigger) -> Self {
        Self {
            id,
            triggers: vec![trigger],
            steps: vec![]
        }
    }

    pub(crate) fn update_triggers(&mut self, triggers: Vec<ReactionTrigger>) -> Result<(), ()> {
        if triggers.is_empty() {
            Err(())
        } else {
            self.triggers = triggers;
            Ok(())
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

        Ok(ReactionTrigger::ChatCommand(ChatCommandTrigger { text: trigger }))
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
    pub fn contextualise_text_reaction(&self, stimulus: &Stimulus) -> ReactionStepText {
        match self {
            ReactionStepTextDefinition::Instant(_) => ReactionStepText::Instant(self.apply_context(stimulus)),
            ReactionStepTextDefinition::LetterByLetter(_) => ReactionStepText::LetterByLetter(self.apply_context(stimulus)),
        }
    }

    fn apply_context(&self, stimulus: &Stimulus) -> String {
        let mut text = self.get_text();
        if text.contains("${user}") {
            text = text.replace("${user}", &stimulus.get_source_name())
        }

        match stimulus {
            Stimulus::ChatMessage(message) => {
                if text.contains("${target}") {
                    text = text.replace("${target}", &message.get_target().unwrap_or_else(|| "".to_string()))
                }

                if text.contains("${touser}") {
                    text = text.replace("${touser}", &message.get_target().unwrap_or_else(|| stimulus.get_source_name()))
                }
            }
        }

        text
    }
}