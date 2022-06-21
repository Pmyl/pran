use dotenv::dotenv;
use std::env;
use std::future::{Future};
use std::sync::Arc;
use log::{debug, LevelFilter};
use simplelog::SimpleLogger;
use pran_droid_brain::{PranDroidBrainConfig, start_droid_brain};
use pran_droid_core::persistence::emotions::in_memory_emotion_repository::InMemoryEmotionRepository;
use pran_droid_core::persistence::images::in_memory_image_repository::InMemoryImageRepository;
use pran_droid_core::persistence::images::in_memory_image_storage::InMemoryImageStorage;
use pran_droid_core::persistence::reactions::in_memory_reaction_repository::InMemoryReactionRepository;
use crate::asciifier::asciify_gif;

mod asciifier;

#[derive(Debug)]
struct Config {
    twitch_channel: String,
    twitch_client_id: String,
    twitch_client_secret: String,
    twitch_user: String,
    twitch_token: String,
    websocket_port: u16,
    log_level: LevelFilter,
    show_intro: bool,
}

impl Config {
    pub fn new() -> Config {
        Config {
            twitch_channel: env::var("TWITCH_CHANNEL").expect("TWITCH_CHANNEL missing in env variables"),
            twitch_client_id: env::var("TWITCH_CLIENT_ID").expect("TWITCH_CLIENT_ID missing in env variables"),
            twitch_client_secret: env::var("TWITCH_CLIENT_SECRET").expect("TWITCH_CLIENT_SECRET missing in env variables"),
            twitch_user: env::var("TWITCH_USER").expect("TWITCH_USER missing in env variables"),
            twitch_token: env::var("TWITCH_TOKEN").expect("TWITCH_TOKEN missing in env variables"),
            websocket_port: env::var("WEBSOCKET_PORT").or(Ok("8080".to_string())).and_then(|port| port.parse::<u16>()).expect("WEBSOCKET_PORT is not a number"),
            log_level: env::var("LOG_LEVEL").or::<String>(Ok("INFO".to_string())).map(|log_level| match log_level.as_str() {
                "INFO" => LevelFilter::Info,
                "DEBUG" => LevelFilter::Debug,
                _ => LevelFilter::Off
            }).expect("Unexpected error when parsing log_level env"),
            show_intro: !env::var("SKIP_INTRO").or(Ok("false".to_string())).and_then(|skip| skip.parse::<bool>()).expect("SKIP_INTRO is not a bool"),
        }
    }
}

#[tokio::main]
async fn main() {
    dotenv().ok();

    let config = Config::new();
    init_logger(&config);
    debug!("{:?}", config);

    if config.show_intro { asciify_gif("gif.gif"); }

    let _ = start_brain(&config).await;
}

fn start_brain(config: &Config) -> impl Future<Output=()> {
    let reaction_repo = Arc::new(InMemoryReactionRepository::new_with_id_deterministic());
    let emotion_repo = Arc::new(InMemoryEmotionRepository::new_with_id_deterministic());
    let images_repo = Arc::new(InMemoryImageRepository::new());
    let images_storage = Arc::new(InMemoryImageStorage::new());

    let twitch_client_secret = config.twitch_client_secret.clone();
    let twitch_client_id = config.twitch_client_id.clone();
    let twitch_token = config.twitch_token.clone();
    let twitch_channel = config.twitch_channel.clone();
    let twitch_user = config.twitch_user.clone();
    let websocket_port = config.websocket_port.clone();

    async move {
        start_droid_brain(PranDroidBrainConfig {
            twitch_client_secret,
            twitch_client_id,
            twitch_token,
            twitch_channel,
            twitch_user,
            websocket_port,
        }, reaction_repo, emotion_repo, images_repo, images_storage).await
    }
}

fn init_logger(config: &Config) {
    if let Err(_) = SimpleLogger::init(config.log_level, simplelog::Config::default()) {
        eprintln!("Failed initializing logger for the application, nothing will be logged.");
    }
}