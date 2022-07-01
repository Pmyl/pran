use std::sync::Arc;
use rocket::response::{Responder, status};
use rocket::serde::json::Json;
use rocket::serde::Deserialize;
use rocket::{Request, response, State};
use rocket::http::Status;
use pran_droid_core::application::reactions::create::{create_reaction, CreateReactionError, CreateReactionRequest};
use pran_droid_core::domain::reactions::reaction_definition_repository::{ReactionDefinitionRepository};
use crate::infrastructure::authenticated::Authenticated;
use crate::reactions::models::reaction_model::ReactionResponse;
use crate::reactions::models::reaction_step_model::ReactionTriggerModel;

#[post("/reactions", format = "json", data = "<payload>")]
pub async fn api_create_reaction(_authenticated: Authenticated, payload: Json<CreateReactionApiRequest>, repo: &State<Arc<dyn ReactionDefinitionRepository>>) -> Result<Json<ReactionResponse>, Error> {
    Ok(Json(create_reaction(payload.0.into(), repo).await?.into()))
}

#[derive(Deserialize)]
pub struct CreateReactionApiRequest {
    trigger: ReactionTriggerModel
}

impl From<CreateReactionApiRequest> for CreateReactionRequest {
    fn from(request: CreateReactionApiRequest) -> CreateReactionRequest {
        CreateReactionRequest {
            trigger: request.trigger.into()
        }
    }
}

#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("{0:?}")]
    CreateReactionError(#[from] CreateReactionError)
}

impl<'r, 'o: 'r> Responder<'r, 'o> for Error {
    fn respond_to(self, req: &'r Request<'_>) -> response::Result<'o> {
        match self {
            Error::CreateReactionError(error) => {
                match error {
                    CreateReactionError::Unexpected => Status::InternalServerError.respond_to(req),
                    CreateReactionError::Conflict(trigger) => status::Conflict(Some(format!("{:?}", trigger))).respond_to(req),
                    CreateReactionError::BadRequest(msg) => status::BadRequest(Some(msg)).respond_to(req)
                }
            }
        }
    }
}

