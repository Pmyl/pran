use std::sync::Arc;
use rocket::{Request, response, State};
use rocket::form::Form;
use rocket::fs::TempFile;
use rocket::http::Status;
use rocket::response::{Responder, status};
use rocket::serde::json::Json;
use pran_droid_core::application::images::create::{create_image, CreateImageRequest, StoreImageError};
use pran_droid_core::domain::images::image_repository::ImageRepository;
use pran_droid_core::domain::images::image_storage::ImageStorage;
use crate::infrastructure::authenticated::Authenticated;
use crate::images::responses::image_response::ImageResponse;

#[post("/images", data = "<payload>")]
pub async fn api_create_image(_authenticated: Authenticated, payload: Form<CreateImageApiRequest<'_>>, repo: &State<Arc<dyn ImageRepository>>, storage: &State<Arc<dyn ImageStorage>>) -> Result<Json<ImageResponse>, Error> {
    let request = into_request(payload)?;
    Ok(Json(create_image(request, repo.as_ref(), storage.as_ref()).await?.into()))
}

#[derive(FromForm)]
pub struct CreateImageApiRequest<'f> {
    id: String,
    data: TempFile<'f>
}

fn into_request(api_request: Form<CreateImageApiRequest>) -> Result<CreateImageRequest, Error> {
    if let Some(path) = api_request.data.path() {
        Ok(CreateImageRequest {
            id: api_request.id.clone(),
            image: std::fs::read(path).unwrap().as_slice().to_vec()
        })
    } else {
        Err(Error::CorruptedFile)
    }
}

#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("{0:?}")]
    StoreImageError(#[from] StoreImageError),
    #[error("Corrupted file")]
    CorruptedFile
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
            Error::CorruptedFile => Status::BadRequest.respond_to(req)
        }
    }
}
