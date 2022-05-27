use std::sync::Arc;
use rocket::response::{Responder, status};
use rocket::serde::json::Json;
use rocket::serde::Deserialize;
use rocket::{Request, response, State};
use crate::api::reactions::models::reaction_step_model::{AnimationFrameModel, ReactionStepModel, ReactionStepSkipModel};
use crate::application::reactions::insert_movement_step::{AddMovementStepToReactionError, insert_movement_step_to_reaction, InsertMovementStepToReactionRequest};
use crate::domain::reactions::reaction_repository::{ReactionRepository};
use crate::ImageRepository;

#[put("/reactions/<reaction_id>/steps", format = "json", data = "<payload>")]
pub fn api_insert_reaction_step(reaction_id: String, payload: Json<InsertReactionStepApiRequest>, repo: &State<Arc<dyn ReactionRepository>>, image_repo: &State<Arc<dyn ImageRepository>>) -> Result<Json<ReactionStepModel>, Error> {
    Ok(Json(insert_movement_step_to_reaction(payload.0.into_request(reaction_id), repo, image_repo)?.into()))
}

#[derive(Deserialize)]
pub struct InsertReactionStepApiRequest {
    index: usize,
    skip: Option<ReactionStepSkipModel>,
    animation: Vec<AnimationFrameModel>
}

impl InsertReactionStepApiRequest {
    fn into_request(self, reaction_id: String) -> InsertMovementStepToReactionRequest {
        InsertMovementStepToReactionRequest {
            reaction_id,
            step_index: self.index,
            skip: self.skip.into(),
            animation: self.animation.into_iter().map(Into::into).collect()
        }
    }
}

#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("{0:?}")]
    AddMovementStepToReactionError(#[from] AddMovementStepToReactionError)
}

impl<'r, 'o: 'r> Responder<'r, 'o> for Error {
    fn respond_to(self, req: &'r Request<'_>) -> response::Result<'o> {
        match self {
            Error::AddMovementStepToReactionError(error) => {
                match error {
                    AddMovementStepToReactionError::WrongAnimationRequest(internal_error) =>
                        status::Conflict(Some(format!("{:?}", internal_error))).respond_to(req),
                    AddMovementStepToReactionError::BadImageRequest(internal_error) =>
                        status::Conflict(Some(format!("{:?}", internal_error))).respond_to(req),
                    AddMovementStepToReactionError::BadRequest(msg) => status::BadRequest(Some(msg)).respond_to(req),
                }
            }
        }
    }
}
