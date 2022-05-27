use crate::domain::images::image::Image;

pub struct ImageDto {
    pub id: String,
    pub url: String
}

impl From<Image> for ImageDto {
    fn from(value: Image) -> Self {
        Self { id: value.id.0, url: value.url.0 }
    }
}