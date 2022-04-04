use std::clone::Clone;
use std::cmp::PartialEq;
use crate::domain::animations::animation::{Animation, AnimationFrame, AnimationFrames, AnimationId};
use crate::domain::images::image::ImageId;

#[derive(Clone)]
pub struct Reaction {
    pub id: ReactionId,
    pub trigger: ReactionTrigger,
    pub steps: Vec<ReactionStep>
}

impl Reaction {
    pub fn new_empty(id: ReactionId, trigger: ReactionTrigger) -> Self {
        Self {
            id,
            trigger,
            steps: vec![]
        }
    }

    pub fn add_step(&mut self, step: ReactionStep) {
        self.steps.push(step);
    }
}

#[derive(Clone, PartialEq)]
pub struct ReactionId(pub String);

#[derive(Clone, PartialEq)]
pub enum ReactionTrigger {
    Chat(ChatTrigger)
}

#[derive(Clone, PartialEq)]
pub struct ChatTrigger {
    pub text: String
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
    Talking(TalkingReactionStep)
}

#[derive(Clone)]
pub struct MovingReactionStep {
    pub animation: Animation,
    pub skip: ReactionStepSkip
}

#[derive(Clone)]
pub enum TalkingReactionStep {
    Single(TalkingStep),
    Composite(Vec<TalkingStep>)
}

#[derive(Clone)]
pub struct TalkingStep {
    pub animation: Animation,
    pub skip: ReactionStepSkip,
    pub text: ReactionStepText
}

#[derive(Clone)]
pub enum ReactionStepSkip {
    AfterMilliseconds(Milliseconds),
    AfterStep(AfterStep, Milliseconds)
}

#[derive(Clone)]
pub enum ReactionStepText {
    Instant(String),
    LetterByLetter(String)
}

#[derive(Clone)]
pub enum AfterStep {
    Animation,
    Text,
    All
}

#[derive(Clone)]
pub struct Milliseconds(pub u16);