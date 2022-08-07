use std::fmt::{Debug, Write};
use std::clone::Clone;
use std::cmp::PartialEq;
use rand::random;
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

    pub(crate) fn remove_step_at_index(&mut self, index: usize) -> Result<(), ()> {
        if self.steps.len() > index {
            self.steps.remove(index);
            Ok(())
        } else {
            Err(())
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
    pub fn new_chat_command(trigger: String) -> Result<Self, ()> {
        if trigger.is_empty() {
            return Err(());
        }

        Ok(ReactionTrigger::ChatCommand(ChatCommandTrigger { text: trigger }))
    }

    pub fn new_chat_keyword(trigger: String) -> Result<Self, ()> {
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
    pub alternatives: ReactionStepMessageAlternativesDefinition,
}

#[derive(Clone, Debug)]
pub struct ReactionStepMessageAlternativesDefinition(pub Vec<ReactionStepMessageAlternativeDefinition>);

#[derive(Clone, Debug)]
pub struct ReactionStepMessageAlternativeDefinition {
    pub message: ReactionStepMessageDefinition,
    pub probability: Option<f32>,
}

pub type ReactionStepSkipDefinition = ReactionStepSkip;
pub type ReactionStepMessageDefinition = ReactionStepText;

impl ReactionStepMessageAlternativesDefinition {
    pub fn try_new(alternatives: Vec<ReactionStepMessageAlternativeDefinition>) -> Result<ReactionStepMessageAlternativesDefinition, ()> {
        let total_probability: f32 = alternatives.iter()
            .filter(|alternative| alternative.probability.is_some())
            .map(|alternative| alternative.probability.unwrap())
            .sum();
        let has_alternatives_without_probability = alternatives.iter().any(|alternative| alternative.probability.is_none());

        if total_probability > 100.0 || total_probability < 100.0 && !has_alternatives_without_probability {
            Err(())
        } else {
            Ok(Self(alternatives))
        }
    }

    pub fn new_single(text: ReactionStepMessageDefinition) -> ReactionStepMessageAlternativesDefinition {
        Self(vec![ReactionStepMessageAlternativeDefinition {
            probability: Some(100.0),
            message: text
        }])
    }

    pub(super) fn get_random_text_pure(alternatives: &Vec<ReactionStepMessageAlternativeDefinition>, mut random_hit: f32) -> ReactionStepMessageDefinition {
        let alternatives_with_none_probability = alternatives.iter()
            .filter(|alternative| alternative.probability.is_none())
            .count() as f32;

        let total_set_probability: f32 = alternatives.iter()
            .map(|alternative| alternative.probability.unwrap_or(0.0))
            .sum();

        let probability_to_share_among_none: f32 = 100.0 - total_set_probability;

        for alternative in alternatives {
            let probability = match alternative.probability {
                None => probability_to_share_among_none / alternatives_with_none_probability,
                Some(probability) => probability
            };

            if probability > random_hit {
                return alternative.message.clone()
            } else {
                random_hit -= probability;
            }
        }

        unreachable!();
    }

    pub(super) fn get_random_text(&self) -> ReactionStepMessageDefinition {
        let random_hit = random::<f32>() * 100.0;
        ReactionStepMessageAlternativesDefinition::get_random_text_pure(&self.0, random_hit)
    }
}

impl ReactionStepMessageDefinition {
    pub fn try_contextualise_text_reaction(&self, context: &ReactionContext) -> Option<ReactionStepText> {
        Some(match self {
            ReactionStepMessageDefinition::Instant(_) => ReactionStepText::Instant(self.try_apply_context(context)?),
            ReactionStepMessageDefinition::LetterByLetter(_) => ReactionStepText::LetterByLetter(self.try_apply_context(context)?),
        })
    }

    fn try_apply_context(&self, context: &ReactionContext) -> Option<String> {
        let text = self.get_text();
        let template_chunks = text.split("$");
        let mut output_message = String::new();

        for template_chunk in template_chunks {
            if template_chunk.starts_with("{user}") {
                write!(output_message, "{}", template_chunk.replacen("{user}", &context.stimulus.get_source_name(), 1).as_str()).unwrap();
                continue;
            }

            if template_chunk.starts_with("{count}") {
                write!(output_message, "{}", template_chunk.replacen("{count}", &context.count.to_string(), 1)).unwrap();
                continue;
            }

            match &context.stimulus {
                Stimulus::ChatMessage(message) => {
                    if template_chunk.starts_with("{target}") {
                        write!(output_message, "{}", template_chunk.replacen("{target}", &message.get_target()?, 1)).unwrap();
                        continue;
                    }

                    if template_chunk.starts_with("{touser}") {
                        write!(output_message,
                               "{}",
                               template_chunk.replacen("{touser}", &message
                                   .get_target()
                                   .unwrap_or_else(|| context.stimulus.get_source_name()),
                               1)).unwrap();
                        continue;
                    }
                }
            }

            write!(output_message, "${}", template_chunk.to_string()).unwrap();
        }

        Some(output_message[1..].to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reaction_text_alternatives_get_random_text_max_random_hit_get_last() {
        let max_random_hit: f32 = 99.9999;
        assert!(matches!(
            get_random_text(&[("some text", Some(100.0))], max_random_hit),
            ReactionStepText::Instant(text) if text == "some text"
        ));
        assert!(matches!(
            get_random_text(&[("some text1", Some(20.0)), ("some text2", Some(20.0)), ("some text3", Some(20.0)), ("some text4", Some(20.0)), ("some text5", Some(20.0))], max_random_hit),
            ReactionStepText::Instant(text) if text == "some text5"
        ));
        assert!(matches!(
            get_random_text(&[("some text1", Some(99.9)), ("some text2", Some(0.1))], max_random_hit),
            ReactionStepText::Instant(text) if text == "some text2"
        ));
    }

    #[test]
    fn reaction_text_alternatives_get_random_text_zero_random_hit_get_first() {
        let max_random_hit: f32 = 0.0;
        assert!(matches!(
            get_random_text(&[("some text", Some(100.0))], max_random_hit),
            ReactionStepText::Instant(text) if text == "some text"
        ));
        assert!(matches!(
            get_random_text(&[("some text1", Some(20.0)), ("some text2", Some(20.0)), ("some text3", Some(20.0)), ("some text4", Some(20.0)), ("some text5", Some(20.0))], max_random_hit),
            ReactionStepText::Instant(text) if text == "some text1"
        ));
        assert!(matches!(
            get_random_text(&[("some text1", Some(0.1)), ("some text2", Some(99.9))], max_random_hit),
            ReactionStepText::Instant(text) if text == "some text1"
        ));
    }

    #[test]
    fn reaction_text_alternatives_get_random_text_alternative_with_zero_probability_never_hits() {
        assert!(matches!(
            get_random_text(&[("some text1", Some(0.0)), ("some text2", Some(100.0))], 0.0),
            ReactionStepText::Instant(text) if text == "some text2"
        ));
        assert!(matches!(
            get_random_text(&[("some text1", Some(100.0)), ("some text2", Some(0.0))], 99.9999),
            ReactionStepText::Instant(text) if text == "some text1"
        ));
    }

    #[test]
    fn reaction_text_alternatives_get_random_text_alternative_with_none_probability_assume_remaining_probability() {
        assert!(matches!(
            get_random_text(&[("some text1", Some(100.0)), ("some text2", None)], 0.0),
            ReactionStepText::Instant(text) if text == "some text1"
        ));
        assert!(matches!(
            get_random_text(&[("some text1", Some(100.0)), ("some text2", None)], 99.9999),
            ReactionStepText::Instant(text) if text == "some text1"
        ));
        assert!(matches!(
            get_random_text(&[("some text1", Some(50.0)), ("some text2", None)], 49.9),
            ReactionStepText::Instant(text) if text == "some text1"
        ));
        assert!(matches!(
            get_random_text(&[("some text1", Some(50.0)), ("some text2", None)], 50.1),
            ReactionStepText::Instant(text) if text == "some text2"
        ));
        assert!(matches!(
            get_random_text(&[("some text1", Some(50.0)), ("some text2", None), ("some text3", None)], 49.9),
            ReactionStepText::Instant(text) if text == "some text1"
        ));
        assert!(matches!(
            get_random_text(&[("some text1", Some(50.0)), ("some text2", None), ("some text3", None)], 74.9),
            ReactionStepText::Instant(text) if text == "some text2"
        ));
        assert!(matches!(
            get_random_text(&[("some text1", Some(50.0)), ("some text2", None), ("some text3", None)], 75.1),
            ReactionStepText::Instant(text) if text == "some text3"
        ));
    }

    fn get_random_text(alternatives: &[(&str, Option<f32>)], random_hit: f32) -> ReactionStepText {
        ReactionStepMessageAlternativesDefinition::get_random_text_pure(
            &alternatives.iter().map(|alternative| ReactionStepMessageAlternativeDefinition {
                message: ReactionStepText::Instant(alternative.0.to_string()),
                probability: alternative.1
            }).collect(),
            random_hit
        )
    }
}