use std::sync::Arc;
use rocket::response::{Responder, status};
use rocket::serde::json::Json;
use rocket::serde::Deserialize;
use rocket::{Request, response, State};
use rocket::http::Status;
use pran_droid_core::application::reactions::dtos::reaction_step_dto::{ReactionStepTextAlternativeDto, ReactionStepTextDto};
use pran_droid_core::application::reactions::insert_movement_step::{AddMovementStepToReactionError, insert_movement_step_to_reaction, InsertMovementStepToReactionRequest};
use pran_droid_core::application::reactions::insert_talking_step::{AddTalkingStepToReactionError, insert_talking_step_to_reaction, InsertTalkingStepToReactionRequest};
use pran_droid_core::application::reactions::remove_step::{remove_step_from_reaction, RemoveStepFromReactionError, RemoveStepFromReactionRequest};
use pran_droid_core::domain::emotions::emotion_repository::EmotionRepository;
use pran_droid_core::domain::reactions::reaction_definition_repository::{ReactionDefinitionRepository};
use pran_droid_core::domain::images::image_repository::ImageRepository;
use crate::infrastructure::authenticated::Authenticated;
use crate::reactions::models::reaction_step_model::{AnimationFrameModel, from_model_to_dto, ReactionStepModel, ReactionStepSkipModel, ReactionStepMessageAlternativeModel, ReactionStepMessageModel};

#[delete("/reactions/<reaction_id>/steps", format = "json", data = "<payload>")]
pub async fn api_remove_reaction_step(_authenticated: Authenticated, reaction_id: String, payload: Json<RemoveReactionStepApiRequest>, repo: &State<Arc<dyn ReactionDefinitionRepository>>) -> Result<(), Error> {
    remove_step_from_reaction(payload.0.into_request(reaction_id), repo.as_ref()).await?;
    Ok(())
}

#[derive(Deserialize)]
pub struct RemoveReactionStepApiRequest {
    index: usize
}

impl RemoveReactionStepApiRequest {
    fn into_request(self, reaction_id: String) -> RemoveStepFromReactionRequest {
        RemoveStepFromReactionRequest {
            reaction_id,
            step_index: self.index
        }
    }
}

#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("{0:?}")]
    RemoveStepFromReactionError(#[from] RemoveStepFromReactionError)
}

impl<'r, 'o: 'r> Responder<'r, 'o> for Error {
    fn respond_to(self, req: &'r Request<'_>) -> response::Result<'o> {
        match self {
            Error::RemoveStepFromReactionError(error) => {
                match error {
                    RemoveStepFromReactionError::NotExistingMainAggregate => Status::NotFound.respond_to(req),
                    RemoveStepFromReactionError::BadRequest(msg) => status::BadRequest(Some(msg)).respond_to(req)
                }
            }
        }
    }
}

