use crate::domain::reactions::reaction::ReactionStep;
use std::fmt::Debug;
use rocket::serde::Serialize;

#[derive(Debug, Serialize)]
pub struct ReactionStepDto {

}

impl From<ReactionStep> for ReactionStepDto {
    fn from(value: ReactionStep) -> Self {
        Self { }
    }
}