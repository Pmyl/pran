use std::env;
use rocket::http::Status;
use rocket::request::Outcome;
use rocket::Request;
use rocket::request::FromRequest;

pub struct Authenticated;

#[rocket::async_trait]
impl<'r> FromRequest<'r> for Authenticated {
    type Error = String;
    async fn from_request(request: &'r Request<'_>) -> Outcome<Self, Self::Error> {
        let cookie_api_secret_key = request.cookies().get("api_secret_key").map(|key| key.value().to_string());
        let api_secret_key = env::var("API_SECRET_KEY");
        match (cookie_api_secret_key, api_secret_key) {
            (Some(cookie_key), Ok(key)) if cookie_key == key => Outcome::Success(Authenticated),
            _ => Outcome::Failure((Status::Unauthorized, String::from("Not authorized")))
        }
    }
}