use std::sync::Arc;
use rocket::response::{Responder, status};
use rocket::serde::json::Json;
use rocket::serde::Deserialize;
use rocket::{Request, response, State};
use pran_droid_core::application::reactions::insert_movement_step::{AddMovementStepToReactionError, insert_movement_step_to_reaction, InsertMovementStepToReactionRequest};
use pran_droid_core::domain::reactions::reaction_definition_repository::{ReactionDefinitionRepository};
use pran_droid_core::domain::images::image_repository::ImageRepository;
use crate::reactions::models::reaction_step_model::{AnimationFrameModel, from_model_to_dto, ReactionStepModel, ReactionStepSkipModel};

#[put("/reactions/<reaction_id>/steps", format = "json", data = "<payload>")]
pub async fn api_insert_reaction_step(reaction_id: String, payload: Json<InsertReactionStepApiRequest>, repo: &State<Arc<dyn ReactionDefinitionRepository>>, image_repo: &State<Arc<dyn ImageRepository>>) -> Result<Json<ReactionStepModel>, Error> {
    Ok(Json(insert_movement_step_to_reaction(payload.0.into_request(reaction_id), repo, image_repo).await?.into()))
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
            skip: from_model_to_dto(self.skip),
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
                        status::BadRequest(Some(format!("{:?}", internal_error))).respond_to(req),
                    AddMovementStepToReactionError::BadImageRequest(internal_error) =>
                        status::BadRequest(Some(format!("{:?}", internal_error))).respond_to(req),
                    AddMovementStepToReactionError::BadRequest(msg) => status::BadRequest(Some(msg)).respond_to(req),
                }
            }
        }
    }
}

