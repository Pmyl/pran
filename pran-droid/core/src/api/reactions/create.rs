use std::sync::Arc;
use rocket::response::{Responder, status};
use rocket::serde::json::Json;
use rocket::serde::Deserialize;
use rocket::{Request, response, State};
use rocket::http::Status;
use crate::api::reactions::models::reaction_model::ReactionResponse;
use crate::application::reactions::create::{create_reaction, CreateReactionError, CreateReactionRequest};
use crate::domain::reactions::reaction_repository::{ReactionRepository};

#[post("/reactions", format = "json", data = "<payload>")]
pub fn api_create_reaction(payload: Json<CreateReactionApiRequest>, repo: &State<Arc<dyn ReactionRepository>>) -> Result<Json<ReactionResponse>, Error> {
    Ok(Json(create_reaction(payload.0.into(), repo)?.into()))
}

#[derive(Deserialize)]
pub struct CreateReactionApiRequest {
    trigger: String
}

impl Into<CreateReactionRequest> for CreateReactionApiRequest {
    fn into(self) -> CreateReactionRequest {
        CreateReactionRequest {
            trigger: self.trigger
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
                    CreateReactionError::Conflict(msg) => status::Conflict(Some(msg)).respond_to(req),
                    CreateReactionError::BadRequest(msg) => status::BadRequest(Some(msg)).respond_to(req)
                }
            }
        }
    }
}

