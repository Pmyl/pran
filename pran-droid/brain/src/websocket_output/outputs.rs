use serde::Serialize;
use pran_droid_core::domain::reactions::reaction::{Reaction, ReactionStep, ReactionStepSkip};

#[derive(Clone, Debug, Serialize)]
pub(crate) struct ReactionOutput {
    pub steps: Vec<ReactionStepOutput>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(tag = "type")]
pub(crate) enum ReactionStepOutput {
    Moving(MovingReactionStepOutput)
}

#[derive(Clone, Debug, Serialize)]
pub(crate) struct MovingReactionStepOutput {
    pub animation: Vec<AnimationFrameOutput>,
    pub skip: Option<ReactionStepSkipOutput>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AnimationFrameOutput {
    pub frame_start: u16,
    pub frame_end: u16,
    pub image_id: String,
}

#[derive(Clone, Debug, Serialize)]
pub(crate) enum ReactionStepSkipOutput {
    AfterMilliseconds(u16)
}

impl From<&Reaction> for ReactionOutput {
    fn from(reaction: &Reaction) -> Self {
        ReactionOutput {
            steps: reaction.steps.iter()
                .map(|step| match step {
                    ReactionStep::Moving(ref moving_step) => ReactionStepOutput::Moving(MovingReactionStepOutput {
                        animation: moving_step.animation.frames.0.iter().map(|frame| AnimationFrameOutput {
                            frame_end: frame.frame_end,
                            frame_start: frame.frame_start,
                            image_id: frame.image_id.0.clone()
                        }).collect(),
                        skip: match &moving_step.skip {
                            ReactionStepSkip::ImmediatelyAfter => None,
                            ReactionStepSkip::AfterMilliseconds(ms) => Some(ReactionStepSkipOutput::AfterMilliseconds(ms.0))
                        }
                    })
                })
                .collect()
        }
    }
}