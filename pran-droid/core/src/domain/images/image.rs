use std::fmt::Debug;
use std::clone::Clone;
use std::cmp::PartialEq;

#[derive(Debug, Clone, PartialEq)]
pub struct ImageId(pub String);

#[derive(Debug, Clone)]
pub struct ImageUrl(pub String);

#[derive(Debug, Clone)]
pub struct Image {
    pub id: ImageId,
    pub url: ImageUrl
}

impl Image {
    pub(crate) fn new(id: &ImageId, url: &ImageUrl) -> Image {
        Image { id: id.clone(), url: url.clone() }
    }
}

impl TryFrom<String> for ImageId {
    type Error = ();

    fn try_from(value: String) -> Result<Self, Self::Error> {
        if value.is_empty() {
            return Err(());
        }
        Ok(ImageId(value))
    }
}
