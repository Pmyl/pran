use std::sync::Arc;
use rocket::response::{Responder, status};
use rocket::serde::Deserialize;
use rocket::{Request, response, State};
use rocket::http::Status;
use rocket::serde::json::Json;
use pran_droid_core::application::emotions::create::{create_emotion, CreateEmotionError, CreateEmotionRequest};
use pran_droid_core::domain::emotions::emotion_repository::EmotionRepository;
use crate::infrastructure::authenticated::Authenticated;
use crate::emotions::responses::emotion_response::EmotionResponse;

#[derive(Deserialize)]
pub struct CreateEmotionApiRequest {
    name: String,
}

#[post("/emotions", format = "json", data = "<payload>")]
pub async fn api_create_emotions(_authenticated: Authenticated, payload: Json<CreateEmotionApiRequest>, repo: &State<Arc<dyn EmotionRepository>>) -> Result<Json<EmotionResponse>, Error> {
    Ok(Json(create_emotion(CreateEmotionRequest { name: payload.name.clone() }, repo.as_ref()).await?.into()))
}

#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("{0:?}")]
    CreateError(#[from] CreateEmotionError)
}

impl<'r, 'o: 'r> Responder<'r, 'o> for Error {
    fn respond_to(self, req: &'r Request<'_>) -> response::Result<'o> {
        match self {
            Error::CreateError(error) => match error {
                CreateEmotionError::Unexpected(msg) => {
                    error!("Unexpected error {}", msg);
                    Status::InternalServerError.respond_to(req)
                },
                CreateEmotionError::Conflict(msg) => status::Conflict(Some(msg.0)).respond_to(req),
                CreateEmotionError::BadRequest(msg) => status::BadRequest(Some(msg)).respond_to(req)
            },
        }
    }
}
