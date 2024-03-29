#[macro_use] extern crate rocket;

use dotenv::dotenv;
use log::LevelFilter;
use rocket::{figment::{Figment, providers::Env}, Config as RocketConfig, State};
use rocket::data::{Limits, ToByteUnit};
use rocket::fs::{FileServer, NamedFile};
use simplelog::SimpleLogger;
use std::sync::Arc;
use pran_droid_core::domain::emotions::emotion_repository::EmotionRepository;
use pran_droid_core::domain::images::image_repository::ImageRepository;
use pran_droid_core::domain::images::image_storage::ImageStorage;
use pran_droid_core::domain::reactions::reaction_definition_repository::ReactionDefinitionRepository;
use pran_droid_core::persistence::emotions::in_memory_emotion_repository::InMemoryEmotionRepository;
use pran_droid_core::persistence::images::in_memory_image_repository::InMemoryImageRepository;
use pran_droid_core::persistence::images::in_memory_image_storage::InMemoryImageStorage;
use pran_droid_core::persistence::reactions::in_memory_reaction_repository::InMemoryReactionRepository;
use pran_droid_persistence_deta::emotions::deta_emotion_repository::DetaEmotionRepository;
use pran_droid_persistence_deta::images::deta_image_repository::DetaImageRepository;
use pran_droid_persistence_deta::images::deta_image_storage::DetaImageStorage;
use pran_droid_persistence_deta::reactions::deta_reaction_repository::DetaReactionRepository;
use crate::test_database::build_test_database::build_test_database;
use crate::emotions::create::api_create_emotions;
use crate::emotions::get_all::api_get_all_emotions;
use crate::images::get_all::api_get_all_images;
use crate::images::create::api_create_image;
use crate::images::get_from_storage::api_get_image_from_storage;
use crate::infrastructure::config::{Config, RuntimeMode};
use crate::reactions::patch::api_patch_reaction;
use crate::reactions::create::api_create_reaction;
use crate::reactions::get::api_get_reaction;
use crate::reactions::get_all::api_get_all_reactions;
use crate::reactions::insert_step::api_insert_reaction_step;
use crate::reactions::remove_step::api_remove_reaction_step;
use crate::brain::simulate_message::api_brain_simulate_message;
use crate::brain::simulate_action::api_brain_simulate_action;

mod infrastructure;
mod emotions;
mod images;
mod reactions;
mod brain;
mod test_database;

#[get("/<_..>", rank = 2)]
async fn index_handler(config: &State<Config>) -> Option<NamedFile> {
    NamedFile::open(format!("{}/index.html", config.static_path.clone())).await.ok()
}

#[rocket::main]
async fn main() {
    dotenv().ok();
    init_logger();
    let config = Config::new();
    debug!("{:?}", config);

    let reaction_repo: Arc<dyn ReactionDefinitionRepository>;
    let emotion_repo: Arc<dyn EmotionRepository>;
    let images_repo: Arc<dyn ImageRepository>;
    let images_storage: Arc<dyn ImageStorage>;

    match config.mode {
        RuntimeMode::Development => {
            reaction_repo = Arc::new(InMemoryReactionRepository::new());
            emotion_repo = Arc::new(InMemoryEmotionRepository::new());
            images_repo = Arc::new(InMemoryImageRepository::new());
            images_storage = Arc::new(InMemoryImageStorage::new());
            build_test_database(reaction_repo.as_ref(), emotion_repo.as_ref(), images_repo.as_ref(), images_storage.as_ref()).await;
        },
        RuntimeMode::Production => {
            reaction_repo = Arc::new(DetaReactionRepository::new(config.deta_project_key.clone(), config.deta_project_id.clone()));
            emotion_repo = Arc::new(DetaEmotionRepository::new(config.deta_project_key.clone(), config.deta_project_id.clone()));
            images_repo = Arc::new(DetaImageRepository::new(config.deta_project_key.clone(), config.deta_project_id.clone()));
            images_storage = Arc::new(DetaImageStorage::new(config.deta_project_key.clone(), config.deta_project_id.clone()));
        },
    }

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
        .mount("/", FileServer::from(static_path).rank(1))
        .mount("/", routes![index_handler])
        .mount("/api", routes![
            api_get_all_emotions,
            api_create_emotions,
            api_get_all_images,
            api_get_image_from_storage,
            api_create_image,
            api_create_reaction,
            api_patch_reaction,
            api_get_reaction,
            api_get_all_reactions,
            api_insert_reaction_step,
            api_remove_reaction_step,
            api_brain_simulate_message,
            api_brain_simulate_action
        ]).launch();

    let _ = api.await;
}

fn init_logger() {
    if let Err(_) = SimpleLogger::init(LevelFilter::Debug, simplelog::Config::default()) {
        eprintln!("Failed initializing logger for the application, nothing will be logged.");
    }
}
