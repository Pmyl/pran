use rocket::State;
use rocket::http::Status;
use rocket::request::Outcome;
use rocket::Request;
use rocket::request::FromRequest;
use rocket::outcome::try_outcome;
use crate::infrastructure::config::Config;

pub struct AuthenticatedReadOnly;
pub struct Authenticated;

#[rocket::async_trait]
impl<'r> FromRequest<'r> for AuthenticatedReadOnly {
    type Error = ();
    async fn from_request(request: &'r Request<'_>) -> Outcome<Self, Self::Error> {
        let cookie_api_secret_key = request.cookies().get("api_secret_key").map(|key| key.value().to_string());
        let config: &State<Config> = try_outcome!(request.guard::<&State<Config>>().await);

        match cookie_api_secret_key {
            Some(cookie_key) if cookie_key == config.read_api_secret_key || cookie_key == config.write_api_secret_key => Outcome::Success(AuthenticatedReadOnly),
            _ => Outcome::Failure((Status::Unauthorized, ()))
        }
    }
}

#[rocket::async_trait]
impl<'r> FromRequest<'r> for Authenticated {
    type Error = ();
    async fn from_request(request: &'r Request<'_>) -> Outcome<Self, Self::Error> {
        let cookie_api_secret_key = request.cookies().get("api_secret_key").map(|key| key.value().to_string());
        let config: &State<Config> = try_outcome!(request.guard::<&State<Config>>().await);

        match cookie_api_secret_key {
            Some(cookie_key) if cookie_key == config.write_api_secret_key => Outcome::Success(Authenticated),
            _ => Outcome::Failure((Status::Unauthorized, ()))
        }
    }
}