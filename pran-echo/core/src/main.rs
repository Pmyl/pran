#[macro_use] extern crate rocket;
extern crate dotenv;

mod gentle;
mod errors;
mod core;
mod api_structures;

use std::path::PathBuf;
use pran_phonemes_core::phonemes::{phonemise_audio, phonemise_text, pran_phonemes, transcribe_audio};
use rocket::fs::{FileServer, NamedFile};
use rocket::form::Form;
use rocket::serde::{json::Json};
use rocket::{Request, response, Response, State};
use rocket::{figment::{Figment, providers::Env}, Config as RocketConfig };
use rocket::data::{Limits, ToByteUnit};
use rocket::response::Responder;
use crate::errors::custom_error::{CustomError};
use crate::api_structures::inputs::{AudioUpload, AudioWithTextUpload, Text};
use crate::api_structures::outputs::PhonemisationResult;
use crate::core::config::{Config};
use crate::gentle::gentle_api::{phonemise_gentle};

struct IndexFile(NamedFile);

impl<'r, 'o: 'r> Responder<'r, 'o> for IndexFile {
    fn respond_to(self, req: &'r Request<'_>) -> response::Result<'o> {
        Response::build_from(self.0.respond_to(req)?)
            .raw_header("Cross-Origin-Opener-Policy", "same-origin")
            .raw_header("Cross-Origin-Embedder-Policy", "require-corp")
            .ok()
    }
}

#[get("/")]
async fn index_handler(config: &State<Config>) -> Option<IndexFile> {
    NamedFile::open(format!("{}/index.html", config.static_path.clone())).await.ok().map(|nf| IndexFile(nf))
}

#[launch]
fn rocket() -> _ {
    pran_phonemes().ok();
    let config = Config::new();
    println!("{}", config);
    let static_path = config.static_path.clone();
    let limits = Limits::default()
        .limit("file", 10_i32.mebibytes());

    let figment = Figment::from(RocketConfig::default())
        .merge((RocketConfig::LIMITS, limits))
        .merge((RocketConfig::PORT, config.port))
        .merge(Env::prefixed("ROCKET_"));

    rocket::custom(figment)
        .manage(config)
        .mount("/", routes![index_handler])
        .mount("/", FileServer::from(static_path))
        .mount("/api", routes![api_phonemise_audio, api_phonemise_audio_advanced, api_phonemise_text, api_phonemise_text_advanced])
}

#[post("/audio", data = "<data>")]
async fn api_phonemise_audio(data: Form<AudioUpload<'_>>) -> Result<Json<PhonemisationResult>, CustomError> {
    phonemise_audio_local(data)
}

#[post("/audio/advanced", data = "<data>")]
async fn api_phonemise_audio_advanced(data: Form<AudioUpload<'_>>, config: &State<Config>) -> Result<Json<PhonemisationResult>, CustomError> {
    if config.use_gentle {
        phonemise_audio_gentle(data, config).await
    } else {
        phonemise_audio_local(data)
    }
}

#[post("/text", data = "<data>")]
async fn api_phonemise_text(data: Form<Text>) -> Result<Json<PhonemisationResult>, CustomError> {
    phonemise_text_local(data)
}

#[post("/text/advanced", data = "<data>")]
async fn api_phonemise_text_advanced(data: Form<AudioWithTextUpload<'_>>, config: &State<Config>) -> Result<Json<PhonemisationResult>, CustomError> {
    if config.use_gentle {
        phonemise_text_gentle(data, config).await
    } else {
        phonemise_text_local(Form::from(Text { text: data.text.clone() }))
    }
}

fn phonemise_text_local(data: Form<Text>) -> Result<Json<PhonemisationResult>, CustomError> {
    phonemise_text(data.text.clone())
        .map(|result| Json(result.into()))
        .map_err(|e| CustomError(format!("{:?}", e)))
}

fn phonemise_audio_local(data: Form<AudioUpload>) -> Result<Json<PhonemisationResult>, CustomError> {
    match data.recording.path() {
        Some(path) => {
            phonemise_audio(path.as_os_str().to_os_string().into_string().unwrap())
                .map(|audio_result| Json(audio_result.into()))
                .map_err(|e| CustomError(format!("{:?}", e)))
        },
        None => Err(CustomError("Something went wrong, file was not saved in a temp location, try again".to_string()))
    }
}

async fn phonemise_audio_gentle(data: Form<AudioUpload<'_>>, config: &State<Config>) -> Result<Json<PhonemisationResult>, CustomError> {
    match data.recording.path() {
        Some(path) => {
            match transcribe_audio(path.to_string_lossy().to_string()) {
                Ok(transcription) => {
                    phonemise_gentle(
                        config,
                        path.to_string_lossy().to_string(),
                        transcription
                    ).await.map(|gentle_result| Json(gentle_result.into()))
                },
                Err(e) => Err(CustomError(format!("An error occurred {:?}", e)))
            }
        },
        None => Err(CustomError("Something went wrong, file was not saved in a temp location, try again".to_string()))
    }
}

async fn phonemise_text_gentle(data: Form<AudioWithTextUpload<'_>>, config: &State<Config>) -> Result<Json<PhonemisationResult>, CustomError> {
    let transcription = data.text.clone();

    match data.recording.path() {
        Some(path) => {
            phonemise_gentle(
                config,
                path.to_string_lossy().to_string(),
                transcription
            ).await.map(|gentle_result| Json(gentle_result.into()))
        },
        None => Err(CustomError("Something went wrong, file was not saved in a temp location, try again".to_string()))
    }
}
