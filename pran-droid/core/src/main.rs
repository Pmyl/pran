#[macro_use] extern crate rocket;

use pran_phonemes_core::phonemes::pran_phonemes;
use std::fmt::{Debug};
use std::sync::Arc;
use rocket::{figment::{Figment, providers::Env}, Config as RocketConfig };
use rocket::data::{Limits, ToByteUnit};
use api::emotions::create::api_create_emotion;
use api::images::get_all::api_get_all_images;
use api::images::create::api_create_image;
use api::reactions::create::api_create_reaction;
use api::reactions::get::api_get_reaction;
use api::reactions::insert_step::api_insert_reaction_step;
use crate::domain::images::image_repository::ImageRepository;
use crate::domain::images::image_storage::ImageStorage;
use crate::domain::reactions::reaction_repository::ReactionRepository;
use crate::persistence::images::in_memory_image_repository::InMemoryImageRepository;
use crate::persistence::images::in_memory_image_storage::InMemoryImageStorage;
use crate::persistence::reactions::in_memory_reaction_repository::InMemoryReactionRepository;

mod api;
mod application;
mod domain;
mod persistence;

#[derive(Debug)]
struct Config {
    static_path: String,
    port: u16
}

impl Config {
    pub fn new() -> Config {
        Config {
            static_path: "../frontend/dist".to_string(),
            port: 8000
        }
    }
}

#[launch]
fn rocket() -> _ {
    pran_phonemes().ok();
    let config = Config::new();
    let reaction_repo = Arc::new(InMemoryReactionRepository::new());
    let images_repo = Arc::new(InMemoryImageRepository::new());
    let images_storage = Arc::new(InMemoryImageStorage::new());
    println!("{:?}", config);
    let static_path = config.static_path.clone();
    let limits = Limits::default()
        .limit("file", 10_i32.mebibytes());

    let figment = Figment::from(RocketConfig::default())
        .merge((RocketConfig::LIMITS, limits))
        .merge((RocketConfig::PORT, config.port))
        .merge(Env::prefixed("ROCKET_"));

    rocket::custom(figment)
        .manage(config)
        .manage::<Arc<dyn ImageRepository>>(images_repo)
        .manage::<Arc<dyn ImageStorage>>(images_storage)
        .manage::<Arc<dyn ReactionRepository>>(reaction_repo)
        // .mount("/", FileServer::from(static_path))
        .mount("/api", routes![
            api_create_emotion,
            api_get_all_images,
            api_create_image,
            api_create_reaction,
            api_get_reaction,
            api_insert_reaction_step,
        ])
}
