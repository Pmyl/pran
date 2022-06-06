use std::sync::Arc;
use crate::application::brain::pran_droid_brain::TextPhonemiser;
use crate::domain::animations::animation::Animation;
use crate::domain::emotions::emotion::EmotionId;
use crate::domain::reactions::reaction_definition::{ReactionDefinition, ReactionStepDefinition, TalkingReactionStepDefinition};

#[derive(Clone)]
pub struct Reaction {
    pub steps: Vec<ReactionStep>
}

#[derive(Clone)]
pub enum ReactionStep {
    Moving(MovingReactionStep),
    Talking(TalkingReactionStep),
    CompositeTalking(Vec<TalkingReactionStep>)
}

#[derive(Clone)]
pub struct MovingReactionStep {
    pub animation: Animation,
    pub skip: ReactionStepSkip
}

#[derive(Clone)]
pub struct TalkingReactionStep {
    pub emotion_id: EmotionId,
    pub skip: ReactionStepSkip,
    pub phonemes: Vec<String>,
    pub text: ReactionStepText
}

#[derive(Clone)]
pub enum ReactionStepSkip {
    ImmediatelyAfter,
    AfterMilliseconds(Milliseconds),
    //AfterStep(AfterStep, Milliseconds)
}

#[derive(Clone)]
pub enum ReactionStepText {
    Instant(String),
    LetterByLetter(String)
}

// #[derive(Clone)]
// pub enum AfterStep {
//     Animation,
//     Text,
//     All
// }

#[derive(Clone)]
pub struct Milliseconds(pub u16);

impl Reaction {
    pub(crate) fn create(text_phonemiser: &Arc<dyn TextPhonemiser>, definition: &ReactionDefinition) -> Self {
        Reaction {
            steps: definition.steps.iter().map(|step| ReactionStep::create(text_phonemiser, step)).collect()
        }
    }
}

impl ReactionStep {
    pub(crate) fn create(text_phonemiser: &Arc<dyn TextPhonemiser>, definition: &ReactionStepDefinition) -> Self {
        match definition {
            ReactionStepDefinition::Moving(moving_step_definition) => ReactionStep::Moving(moving_step_definition.clone()),
            ReactionStepDefinition::Talking(talking_step_definition) => ReactionStep::Talking(TalkingReactionStep::create(text_phonemiser, talking_step_definition)),
            ReactionStepDefinition::CompositeTalking(_) => todo!("should never get here")
        }
    }
}

impl TalkingReactionStep {
    fn create(text_phonemiser: &Arc<dyn TextPhonemiser>, definition: &TalkingReactionStepDefinition) -> Self {
        TalkingReactionStep {
            skip: definition.skip.clone(),
            text: definition.text.clone(),
            emotion_id: definition.emotion_id.clone(),
            phonemes: text_phonemiser.phonemise_text(definition.text.get_text())
        }
    }
}