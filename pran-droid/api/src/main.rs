#[macro_use] extern crate rocket;

use std::fmt::{Debug};
use std::sync::Arc;
use rocket::{figment::{Figment, providers::Env}, Config as RocketConfig };
use rocket::data::{Limits, ToByteUnit};
use rocket::fs::FileServer;
use pran_droid_core::domain::images::image_repository::ImageRepository;
use pran_droid_core::domain::images::image_storage::ImageStorage;
use pran_droid_core::domain::reactions::reaction_definition_repository::ReactionDefinitionRepository;
use pran_droid_core::persistence::images::in_memory_image_repository::InMemoryImageRepository;
use pran_droid_core::persistence::images::in_memory_image_storage::InMemoryImageStorage;
use pran_droid_core::persistence::reactions::in_memory_reaction_repository::InMemoryReactionRepository;
use crate::emotions::create::api_create_emotion;
use crate::images::get_all::api_get_all_images;
use crate::images::create::api_create_image;
use crate::reactions::create::api_create_reaction;
use crate::reactions::get::api_get_reaction;
use crate::reactions::insert_step::api_insert_reaction_step;

mod emotions;
mod images;
mod reactions;

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
        .manage::<Arc<dyn ReactionDefinitionRepository>>(reaction_repo)
        .mount("/", FileServer::from(static_path))
        .mount("/api", routes![
            api_create_emotion,
            api_get_all_images,
            api_create_image,
            api_create_reaction,
            api_get_reaction,
            api_insert_reaction_step,
        ])
}
