use std::fmt::Debug;
use std::clone::Clone;
use std::cmp::PartialEq;
use crate::domain::brain::stimuli::Stimulus;
use crate::domain::emotions::emotion::EmotionId;
use crate::domain::reactions::reaction::{MovingReactionStep, ReactionContext, ReactionStepSkip, ReactionStepText};

#[derive(Clone, Debug)]
pub struct ReactionDefinition {
    pub id: ReactionDefinitionId,
    pub is_disabled: bool,
    pub triggers: Vec<ReactionTrigger>,
    pub steps: Vec<ReactionStepDefinition>,
    pub count: u32,
}

#[derive(Clone, Debug, Hash, Eq, PartialEq)]
pub struct ReactionDefinitionId(pub String);

#[derive(Debug, Clone, PartialEq)]
pub enum ReactionTrigger {
    ChatCommand(ChatCommandTrigger),
    ChatKeyword(ChatKeywordTrigger),
}

#[derive(Debug, Clone, PartialEq)]
pub struct ChatCommandTrigger {
    pub text: String,
}

#[derive(Debug, Clone)]
pub struct ChatKeywordTrigger {
    pub text: String,
    match_regex: regex::Regex,
}

impl PartialEq for ChatKeywordTrigger {
    fn eq(&self, other: &Self) -> bool {
        self.text == other.text
    }
}

impl ChatCommandTrigger {
    pub fn matches(&self, message_text: &str) -> bool {
        message_text.split_whitespace().next() == Some(&self.text)
    }
}

impl ChatKeywordTrigger {
    pub fn new(text: String) -> Self {
        Self { match_regex: regex::Regex::new(format!("(^| ){}($| )", regex::escape(&text)).as_str()).unwrap(), text }
    }
    pub fn matches(&self, message_text: &str) -> bool {
        self.match_regex.is_match(message_text)
    }
}

impl ReactionDefinition {
    pub(crate) fn new_empty(id: ReactionDefinitionId, trigger: ReactionTrigger) -> Self {
        Self {
            id,
            is_disabled: false,
            triggers: vec![trigger],
            steps: vec![],
            count: 0,
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

    pub(crate) fn update_count(&mut self, new_count: u32) {
        self.count = new_count;
    }

    pub(crate) fn disable(&mut self) {
        self.is_disabled = true;
    }

    pub(crate) fn enable(&mut self) {
        self.is_disabled = false;
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
    pub(crate) fn new_chat_command(trigger: String) -> Result<Self, ()> {
        if trigger.is_empty() {
            return Err(());
        }

        Ok(ReactionTrigger::ChatCommand(ChatCommandTrigger { text: trigger }))
    }

    pub(crate) fn new_chat_keyword(trigger: String) -> Result<Self, ()> {
        if trigger.is_empty() {
            return Err(());
        }

        Ok(ReactionTrigger::ChatKeyword(ChatKeywordTrigger::new(trigger)))
    }
}

#[derive(Clone, Debug)]
pub enum ReactionStepDefinition {
    Moving(MovingReactionStep),
    Talking(TalkingReactionStepDefinition),
    CompositeTalking(Vec<TalkingReactionStepDefinition>),
}

pub type MovingReactionStepDefinition = MovingReactionStep;

#[derive(Clone, Debug)]
pub struct TalkingReactionStepDefinition {
    pub emotion_id: EmotionId,
    pub skip: ReactionStepSkipDefinition,
    pub text: ReactionStepTextDefinition,
}

pub type ReactionStepSkipDefinition = ReactionStepSkip;
pub type ReactionStepTextDefinition = ReactionStepText;

impl ReactionStepTextDefinition {
    pub fn try_contextualise_text_reaction(&self, context: &ReactionContext) -> Option<ReactionStepText> {
        Some(match self {
            ReactionStepTextDefinition::Instant(_) => ReactionStepText::Instant(self.try_apply_context(context)?),
            ReactionStepTextDefinition::LetterByLetter(_) => ReactionStepText::LetterByLetter(self.try_apply_context(context)?),
        })
    }

    fn try_apply_context(&self, context: &ReactionContext) -> Option<String> {
        let text = self.get_text();
        let template_chunks = text.split("$");
        let mut output_message = vec![];

        for template_chunk in template_chunks {
            if template_chunk.starts_with("{user}") {
                output_message.push(template_chunk.replace("{user}", &context.stimulus.get_source_name()));
                continue;
            }

            if template_chunk.starts_with("{count}") {
                output_message.push(template_chunk.replace("{count}", &context.count.to_string()));
                continue;
            }

            match &context.stimulus {
                Stimulus::ChatMessage(message) => {
                    if template_chunk.starts_with("{target}") {
                        output_message.push(template_chunk.replace("{target}", &message.get_target()?));
                        continue;
                    }

                    if template_chunk.starts_with("{touser}") {
                        output_message.push(template_chunk.replace("{touser}", &message.get_target().unwrap_or_else(|| context.stimulus.get_source_name())));
                        continue;
                    }
                }
            }

            output_message.push(template_chunk.to_string());
        }

        Some(output_message.join(""))
    }
}