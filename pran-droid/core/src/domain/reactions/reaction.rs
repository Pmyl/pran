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

impl Reaction {
    pub(crate) fn create(text_phonemiser: &Arc<dyn TextPhonemiser>, definition: &ReactionDefinition, stimulus: &Stimulus) -> Self {
        Reaction {
            steps: definition.steps.iter().map(|step| ReactionStep::create(text_phonemiser, step, stimulus)).collect()
        }
    }
}

impl ReactionStep {
    pub(crate) fn create(text_phonemiser: &Arc<dyn TextPhonemiser>, definition: &ReactionStepDefinition, stimulus: &Stimulus) -> Self {
        match definition {
            ReactionStepDefinition::Moving(moving_step_definition) =>
                ReactionStep::Moving(moving_step_definition.clone()),
            ReactionStepDefinition::Talking(talking_step_definition) =>
                ReactionStep::Talking(TalkingReactionStep::create(text_phonemiser, talking_step_definition, stimulus)),
            ReactionStepDefinition::CompositeTalking(_) =>
                todo!("should never get here because not implemented")
        }
    }
}

impl TalkingReactionStep {
    fn create(text_phonemiser: &Arc<dyn TextPhonemiser>, definition: &TalkingReactionStepDefinition, stimulus: &Stimulus) -> Self {
        let text = definition.text.contextualise_text_reaction(stimulus);

        TalkingReactionStep {
            skip: definition.skip.clone(),
            phonemes: text_phonemiser.phonemise_text(&text.get_text()),
            text,
            emotion_id: definition.emotion_id.clone(),
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