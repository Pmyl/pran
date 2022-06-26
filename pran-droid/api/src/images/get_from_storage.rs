use std::io::Cursor;
use std::sync::Arc;
use rocket::http::{ContentType};
use rocket::{Request, Response, response, State};
use rocket::response::{Responder};
use pran_droid_core::domain::images::image::ImageId;
use pran_droid_core::domain::images::image_repository::ImageRepository;
use pran_droid_core::domain::images::image_storage::ImageStorage;
use crate::infrastructure::authenticated::AuthenticatedReadOnly;

#[get("/images/<image_id>")]
pub async fn api_get_image_from_storage<'t>(_authenticated: AuthenticatedReadOnly, image_id: String, repository: &State<Arc<dyn ImageRepository>>, storage: &State<Arc<dyn ImageStorage>>) -> Option<ImageApiResponse> {
    let image = repository.get(&ImageId(image_id)).await;

    match image {
        Some(image) => storage.get(&image.url).await.map(|image| ImageApiResponse(image.0)),
        None => None
    }
}

pub struct ImageApiResponse(Vec<u8>);

impl<'r> Responder<'r, 'static> for ImageApiResponse {
    fn respond_to(self, _: &'r Request<'_>) -> response::Result<'static> {
        Response::build()
            .header(ContentType::new("image", "png"))
            .sized_body(self.0.len(), Cursor::new(self.0))
            .ok()
    }
}