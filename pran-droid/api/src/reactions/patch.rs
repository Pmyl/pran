use std::sync::Arc;
use serde::Deserialize;
use rocket::response::{Responder, status};
use rocket::serde::json::Json;
use rocket::{Request, response, State};
use rocket::http::Status;
use pran_droid_core::application::reactions::get::{get_reaction, GetReactionRequest};
use pran_droid_core::application::reactions::update::{update_reaction, UpdateReactionError, UpdateReactionRequest};
use pran_droid_core::domain::reactions::reaction_definition_repository::ReactionDefinitionRepository;
use crate::infrastructure::authenticated::Authenticated;
use crate::reactions::create::CreateReactionApiRequest;
use crate::reactions::models::reaction_model::ReactionResponse;

#[patch("/reactions/<reaction_id>", format = "json", data = "<payload>")]
pub async fn api_patch_reaction(_authenticated: Authenticated, reaction_id: String, payload: Json<PatchReactionRequest>, repo: &State<Arc<dyn ReactionDefinitionRepository>>) -> Result<Json<ReactionResponse>, Error> {
    Ok(Json(update_reaction(UpdateReactionRequest {
        id: reaction_id,
        count: payload.0.count,
        ..Default::default()
    }, repo).await?.into()))
}

#[derive(Deserialize)]
pub struct PatchReactionRequest {
    count: Option<u32>,
}

#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("{0:?}")]
    UpdateReactionError(#[from] UpdateReactionError)
}

impl<'r, 'o: 'r> Responder<'r, 'o> for Error {
    fn respond_to(self, req: &'r Request<'_>) -> response::Result<'o> {
        match self {
            Error::UpdateReactionError(error) => {
                match error {
                    UpdateReactionError::Unexpected => Status::InternalServerError.respond_to(req),
                    UpdateReactionError::Conflict(trigger) => status::Conflict(Some(format!("{:?}", trigger))).respond_to(req),
                    UpdateReactionError::BadRequest(msg) => status::BadRequest(Some(msg)).respond_to(req)
                }
            }
        }
    }
}
