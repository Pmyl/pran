use std::{fmt};

#[derive(Responder, Debug, Clone)]
#[response(status = 500, content_type = "json")]
pub struct CustomError(pub String);

impl fmt::Display for CustomError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}