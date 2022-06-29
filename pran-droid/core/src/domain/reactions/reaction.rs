use std::sync::Arc;
use crate::application::brain::pran_droid_brain::TextPhonemiser;
use crate::domain::animations::animation::Animation;
use crate::domain::brain::stimuli::Stimulus;
use crate::domain::emotions::emotion::EmotionId;
use crate::domain::reactions::reaction_definition::{ReactionDefinition, ReactionStepDefinition, TalkingReactionStepDefinition};

#[derive(Clone, Debug)]
pub struct Reaction {
    pub steps: Vec<ReactionStep>
}

#[derive(Clone, Debug)]
pub enum ReactionStep {
    Moving(MovingReactionStep),
    Talking(TalkingReactionStep),
    CompositeTalking(Vec<TalkingReactionStep>)
}

#[derive(Clone, Debug)]
pub struct MovingReactionStep {
    pub animation: Animation,
    pub skip: ReactionStepSkip
}

#[derive(Clone, Debug)]
pub struct TalkingReactionStep {
    pub emotion_id: EmotionId,
    pub skip: ReactionStepSkip,
    pub phonemes: Vec<String>,
    pub text: ReactionStepText
}

#[derive(Clone, Debug)]
pub enum ReactionStepSkip {
    ImmediatelyAfter,
    AfterMilliseconds(Milliseconds),
    AfterStepWithExtraMilliseconds(Milliseconds)
}

#[derive(Clone, Debug)]
pub enum ReactionStepText {
    Instant(String),
    LetterByLetter(String)
}

#[derive(Clone, Debug)]
pub struct Milliseconds(pub u16);

pub struct ReactionContext {
    pub stimulus: Stimulus,
    pub count: u32
}

impl Reaction {
    pub(crate) fn create(text_phonemiser: &Arc<dyn TextPhonemiser>, definition: &ReactionDefinition, context: &ReactionContext) -> Self {
        Reaction {
            steps: definition.steps.iter().map(|step| ReactionStep::create(text_phonemiser, step, context)).collect()
        }
    }
}

impl ReactionStep {
    pub(crate) fn create(text_phonemiser: &Arc<dyn TextPhonemiser>, step_definition: &ReactionStepDefinition, context: &ReactionContext) -> Self {
        match step_definition {
            ReactionStepDefinition::Moving(moving_step_definition) =>
                ReactionStep::Moving(moving_step_definition.clone()),
            ReactionStepDefinition::Talking(talking_step_definition) =>
                ReactionStep::Talking(TalkingReactionStep::create(text_phonemiser, talking_step_definition, context)),
            ReactionStepDefinition::CompositeTalking(_) =>
                todo!("should never get here because not implemented")
        }
    }
}

impl TalkingReactionStep {
    fn create(text_phonemiser: &Arc<dyn TextPhonemiser>, step_definition: &TalkingReactionStepDefinition, context: &ReactionContext) -> Self {
        let text = step_definition.text.contextualise_text_reaction(context);

        TalkingReactionStep {
            skip: step_definition.skip.clone(),
            phonemes: text_phonemiser.phonemise_text(&text.get_text()),
            text,
            emotion_id: step_definition.emotion_id.clone(),
        }
    }
}

impl ReactionStepText {
    pub fn get_text(&self) -> String {
        match self {
            ReactionStepText::Instant(text) => text.clone(),
            ReactionStepText::LetterByLetter(text) => text.clone()
        }
    }
}