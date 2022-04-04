use std::sync::Arc;
use rocket::serde::{Deserialize};
use rocket::{Request, response, State};
use rocket::http::Status;
use rocket::response::{Responder, status};
use rocket::serde::json::Json;
use crate::application::images::create::{create_image, CreateImageRequest, StoreImageError};
use crate::application::images::dtos::image_dto::ImageDto;
use crate::domain::images::image_repository::ImageRepository;
use crate::domain::images::image_storage::ImageStorage;

#[derive(Deserialize)]
pub struct CreateImageApiRequest {
    id: String,
    data: Vec<u8>
}

impl Into<CreateImageRequest> for CreateImageApiRequest {
    fn into(self) -> CreateImageRequest {
        CreateImageRequest {
            id: self.id,
            image: self.data
        }
    }
}

#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("{0:?}")]
    StoreImageError(#[from] StoreImageError)
}

impl<'r, 'o: 'r> Responder<'r, 'o> for Error {
    fn respond_to(self, req: &'r Request<'_>) -> response::Result<'o> {
        match self {
            Error::StoreImageError(error) => {
                match error {
                    StoreImageError::Unexpected => Status::InternalServerError.respond_to(req),
                    StoreImageError::StorageFail => Status::InternalServerError.respond_to(req),
                    StoreImageError::Conflict(msg) => status::Conflict(Some(msg)).respond_to(req),
                    StoreImageError::BadRequest => Status::BadRequest.respond_to(req)
                }
            }
        }
    }
}

#[post("/images", format = "json", data = "<payload>")]
pub fn api_create_image(payload: Json<CreateImageApiRequest>, repo: &State<Arc<dyn ImageRepository>>, storage: &State<Arc<dyn ImageStorage>>) -> Result<Json<ImageDto>, Error> {
    Ok(Json(create_image(payload.0.into(), repo, storage)?.into()))
}