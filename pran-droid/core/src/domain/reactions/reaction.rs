use std::fmt::Debug;
use std::clone::Clone;
use std::cmp::PartialEq;
use crate::domain::animations::animation::{Animation};

#[derive(Clone)]
pub struct Reaction {
    pub id: ReactionId,
    pub trigger: ReactionTrigger,
    pub steps: Vec<ReactionStep>
}

#[derive(Clone, PartialEq)]
pub struct ReactionId(pub String);

#[derive(Debug, Clone, PartialEq)]
pub enum ReactionTrigger {
    Chat(ChatTrigger)
}

#[derive(Debug, Clone, PartialEq)]
pub struct ChatTrigger {
    pub text: String
}

impl Reaction {
    pub(crate) fn new_empty(id: ReactionId, trigger: ReactionTrigger) -> Self {
        Self {
            id,
            trigger,
            steps: vec![]
        }
    }

    pub(crate) fn add_step(&mut self, step: ReactionStep) {
        self.steps.push(step);
    }

    pub(crate) fn replace_step_at(&mut self, step: ReactionStep, index: usize) {
        self.steps.remove(index);
        self.steps.insert(index, step);
    }
}

impl ReactionTrigger {
    pub fn new_chat(trigger: String) -> Result<Self, ()> {
        if trigger.is_empty() {
            return Err(());
        }

        Ok(ReactionTrigger::Chat(ChatTrigger { text: trigger }))
    }
}

#[derive(Clone)]
pub enum ReactionStep {
    Moving(MovingReactionStep),
    //Talking(TalkingReactionStep)
}

#[derive(Clone)]
pub struct MovingReactionStep {
    pub animation: Animation,
    pub skip: ReactionStepSkip
}

// #[derive(Clone)]
// pub enum TalkingReactionStep {
//     Single(TalkingStep),
//     Composite(Vec<TalkingStep>)
// }

// #[derive(Clone)]
// pub struct TalkingStep {
//     pub animation: Animation,
//     pub skip: ReactionStepSkip,
//     pub text: ReactionStepText
// }

#[derive(Clone)]
pub enum ReactionStepSkip {
    ImmediatelyAfter,
    AfterMilliseconds(Milliseconds),
    //AfterStep(AfterStep, Milliseconds)
}

// #[derive(Clone)]
// pub enum ReactionStepText {
//     Instant(String),
//     LetterByLetter(String)
// }

// #[derive(Clone)]
// pub enum AfterStep {
//     Animation,
//     Text,
//     All
// }

#[derive(Clone)]
pub struct Milliseconds(pub u16);