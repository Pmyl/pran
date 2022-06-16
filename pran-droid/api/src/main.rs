#[macro_use] extern crate rocket;

use dotenv::dotenv;
use log::LevelFilter;
use rocket::{figment::{Figment, providers::Env}, Config as RocketConfig };
use rocket::data::{Limits, ToByteUnit};
use rocket::fs::FileServer;
use simplelog::SimpleLogger;
use std::fmt::{Debug};
use std::sync::Arc;
use std::{env};
use futures::future::join;
use pran_droid_brain::PranDroidBrainConfig;
use pran_droid_core::domain::emotions::emotion_repository::EmotionRepository;
use pran_droid_core::domain::images::image_repository::ImageRepository;
use pran_droid_core::domain::images::image_storage::ImageStorage;
use pran_droid_core::domain::reactions::reaction_definition_repository::ReactionDefinitionRepository;
use pran_droid_core::persistence::emotions::in_memory_emotion_repository::InMemoryEmotionRepository;
use pran_droid_core::persistence::images::in_memory_image_repository::InMemoryImageRepository;
use pran_droid_core::persistence::images::in_memory_image_storage::InMemoryImageStorage;
use pran_droid_core::persistence::reactions::in_memory_reaction_repository::InMemoryReactionRepository;
use crate::emotions::get_all::api_get_all_emotions;
use crate::images::get_all::api_get_all_images;
use crate::images::create::api_create_image;
use crate::images::get_from_storage::api_get_image_from_storage;
use crate::reactions::create::api_create_reaction;
use crate::reactions::get::api_get_reaction;
use crate::reactions::insert_step::api_insert_reaction_step;

mod emotions;
mod images;
mod reactions;

#[derive(Debug)]
struct Config {
    static_path: String,
    api_port: u16,
    twitch_channel: String,
    twitch_client_id: String,
    twitch_client_secret: String,
    twitch_user: String,
    twitch_token: String,
    websocket_port: u16,
}

impl Config {
    pub fn new() -> Config {
        Config {
            static_path: env::var("STATIC_PATH").expect("STATIC_PATH missing in env variables. .env not existing?"),
            api_port: env::var("API_PORT").or(Ok("8000".to_string())).and_then(|port| port.parse::<u16>()).expect("PORT not a number"),
            twitch_channel: env::var("TWITCH_CHANNEL").expect("TWITCH_CHANNEL missing in env variables"),
            twitch_client_id: env::var("TWITCH_CLIENT_ID").expect("TWITCH_CLIENT_ID missing in env variables"),
            twitch_client_secret: env::var("TWITCH_CLIENT_SECRET").expect("TWITCH_CLIENT_SECRET missing in env variables"),
            twitch_user: env::var("TWITCH_USER").expect("TWITCH_USER missing in env variables"),
            twitch_token: env::var("TWITCH_TOKEN").expect("TWITCH_TOKEN missing in env variables"),
            websocket_port: env::var("WEBSOCKET_PORT").or(Ok("8080".to_string())).and_then(|port| port.parse::<u16>()).expect("WEBSOCKET_PORT is not a number"),
        }
    }
}

#[rocket::main]
async fn main() {
    dotenv().ok();
    init_logger();
    let config = Config::new();
    debug!("{:?}", config);

    let reaction_repo = Arc::new(InMemoryReactionRepository::new());
    let emotion_repo = Arc::new(InMemoryEmotionRepository::new());
    let images_repo = Arc::new(InMemoryImageRepository::new());
    let images_storage = Arc::new(InMemoryImageStorage::new());

    let brain = tokio::spawn({
        let reaction_repo = reaction_repo.clone();
        let emotion_repo = emotion_repo.clone();
        let images_repo = images_repo.clone();
        let images_storage = images_storage.clone();
        let twitch_client_secret = config.twitch_client_secret.clone();
        let twitch_client_id = config.twitch_client_id.clone();
        let twitch_token = config.twitch_token.clone();
        let twitch_channel = config.twitch_channel.clone();
        let twitch_user = config.twitch_user.clone();
        let websocket_port = config.websocket_port.clone();
        async move {
            pran_droid_brain::start_droid_brain(PranDroidBrainConfig {
                twitch_client_secret,
                twitch_client_id,
                twitch_token,
                twitch_channel,
                twitch_user,
                websocket_port,
            }, reaction_repo, emotion_repo, images_repo, images_storage).await
        }
    });
    let static_path = config.static_path.clone();
    let limits = Limits::default()
        .limit("file", 10_i32.mebibytes());

    let figment = Figment::from(RocketConfig::default())
        .merge((RocketConfig::LIMITS, limits))
        .merge((RocketConfig::PORT, config.api_port))
        .merge(Env::prefixed("ROCKET_"));

    let api = rocket::custom(figment)
        .manage(config)
        .manage::<Arc<dyn EmotionRepository>>(emotion_repo)
        .manage::<Arc<dyn ImageRepository>>(images_repo)
        .manage::<Arc<dyn ImageStorage>>(images_storage)
        .manage::<Arc<dyn ReactionDefinitionRepository>>(reaction_repo)
        .mount("/", FileServer::from(static_path))
        .mount("/api", routes![
            api_get_all_emotions,
            api_get_all_images,
            api_get_image_from_storage,
            api_create_image,
            api_create_reaction,
            api_get_reaction,
            api_insert_reaction_step,
        ]).launch();

    let _ = join(api, brain).await;
}

fn init_logger() {
    if let Err(_) = SimpleLogger::init(LevelFilter::Debug, simplelog::Config::default()) {
        eprintln!("Failed initializing logger for the application, nothing will be logged.");
    }
}
