#[macro_use] extern crate rocket;
extern crate dotenv;

mod gentle;
mod python;
mod errors;
mod core;
mod api_structures;

use rocket::fs::{FileServer};
use rocket::form::Form;
use rocket::serde::{json::Json};
use rocket::{State};
use rocket::{figment::{Figment, providers::Env}, Config as RocketConfig };
use rocket::data::{Limits, ToByteUnit};
use crate::errors::custom_error::{CustomError};
use crate::api_structures::inputs::{AudioUpload, AudioWithTextUpload, Text};
use crate::api_structures::outputs::PhonemisationResult;
use crate::core::config::{Config};
use crate::gentle::gentle_api::{phonemise_gentle};
use crate::python::python_api::{phonemise_audio, phonemise_text, transcribe_audio};

#[launch]
fn rocket() -> _ {
    let config = Config::new();
    println!("{}", config);
    let static_path = config.static_path.clone();
    let limits = Limits::default()
        .limit("file", 10.mebibytes());

    let figment = Figment::from(RocketConfig::default())
        .merge((RocketConfig::LIMITS, limits))
        .merge((RocketConfig::PORT, config.port))
        .merge(Env::prefixed("ROCKET_"));

    pyo3::prepare_freethreaded_python();
    rocket::custom(figment)
        .manage(config)
        .mount("/", FileServer::from(static_path))
        .mount("/api", routes![api_phonemise_audio, api_phonemise_audio_advanced, api_phonemise_text, api_phonemise_text_advanced])
}

#[post("/audio", data = "<data>")]
async fn api_phonemise_audio(data: Form<AudioUpload<'_>>, config: &State<Config>) -> Result<Json<PhonemisationResult>, CustomError> {
    phonemise_audio_local(data, config)
}

#[post("/audio/advanced", data = "<data>")]
async fn api_phonemise_audio_advanced(data: Form<AudioUpload<'_>>, config: &State<Config>) -> Result<Json<PhonemisationResult>, CustomError> {
    if config.use_gentle {
        phonemise_audio_gentle(data, config).await
    } else {
        phonemise_audio_local(data, config)
    }
}

#[post("/text", data = "<data>")]
async fn api_phonemise_text(data: Form<Text>, config: &State<Config>) -> Result<Json<PhonemisationResult>, CustomError> {
    phonemise_text_local(data, config)
}

#[post("/text/advanced", data = "<data>")]
async fn api_phonemise_text_advanced(data: Form<AudioWithTextUpload<'_>>, config: &State<Config>) -> Result<Json<PhonemisationResult>, CustomError> {
    if config.use_gentle {
        phonemise_text_gentle(data, config).await
    } else {
        phonemise_text_local(Form::from(Text { text: data.text.clone() }), config)
    }
}

fn phonemise_text_local(data: Form<Text>, config: &State<Config>) -> Result<Json<PhonemisationResult>, CustomError> {
    phonemise_text(config, data.text.clone())
        .map(|result| Json(result.into()))
        .map_err(|e| CustomError(format!("{:?}", e)))
}

fn phonemise_audio_local(data: Form<AudioUpload>, config: &State<Config>) -> Result<Json<PhonemisationResult>, CustomError> {
    match data.recording.path() {
        Some(path) => {
            phonemise_audio(config, path.as_os_str().to_os_string().into_string().unwrap())
                .map(|audio_result| Json(audio_result.into()))
                .map_err(|e| CustomError(format!("{:?}", e)))
        },
        None => Err(CustomError("Something went wrong, file was not saved in a temp location, try again".to_string()))
    }
}

async fn phonemise_audio_gentle(data: Form<AudioUpload<'_>>, config: &State<Config>) -> Result<Json<PhonemisationResult>, CustomError> {
    match data.recording.path() {
        Some(path) => {
            match transcribe_audio(config, path.to_string_lossy().to_string()) {
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
