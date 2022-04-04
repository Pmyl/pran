use rocket::serde::json::Json;
use rocket::serde::Deserialize;
use std::fmt::Debug;

#[derive(Debug, Deserialize)]
pub struct CreateEmotionRequest {
    lol: String
}

#[post("/emotion", format = "json", data = "<data>")]
pub fn api_create_emotion(data: Json<CreateEmotionRequest>) {
    println!("{:?}", data);
}