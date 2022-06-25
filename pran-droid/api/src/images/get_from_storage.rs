use std::io::Cursor;
use std::sync::Arc;
use rocket::http::{ContentType};
use rocket::{Request, Response, response, State};
use rocket::response::{Responder};
use pran_droid_core::domain::images::image::ImageId;
use pran_droid_core::domain::images::image_repository::ImageRepository;
use pran_droid_core::domain::images::image_storage::ImageStorage;

// TODO: Temporary, to remove when replacing in memory storage with real one
// The image should be retrieved directly via url targeting a file in a "static" folder (like frontend files)
#[get("/images/<image_id>")]
pub async fn api_get_image_from_storage<'t>(image_id: String, repository: &State<Arc<dyn ImageRepository>>, storage: &State<Arc<dyn ImageStorage>>) -> Option<ImageApiResponse> {
    repository.get(&ImageId(image_id))
        .await
        .and_then(|image| storage.get(&image.url))
        .map(|image| ImageApiResponse(image.0))
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