use crate::application::images::dtos::image_dto::ImageDto;
use rocket::serde::Serialize;

#[derive(Serialize)]
pub struct ImageResponse {
    id: String,
    url: String
}

impl From<ImageDto> for ImageResponse {
    fn from(dto: ImageDto) -> ImageResponse {
        ImageResponse {
            id: dto.id,
            url: dto.url
        }
    }
}