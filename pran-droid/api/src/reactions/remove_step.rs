use std::sync::Arc;
use rocket::response::{Responder, status};
use rocket::serde::json::Json;
use rocket::serde::Deserialize;
use rocket::{Request, response, State};
use rocket::http::Status;
use pran_droid_core::application::reactions::remove_step::{remove_step_from_reaction, RemoveStepFromReactionError, RemoveStepFromReactionRequest};
use pran_droid_core::domain::reactions::reaction_definition_repository::{ReactionDefinitionRepository};
use crate::infrastructure::authenticated::Authenticated;

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

