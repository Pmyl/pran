#[macro_use] extern crate rocket;
extern crate dotenv;

use pyo3::prelude::*;
use pyo3::types::{PyList};
use pyo3::PyErr;
use rocket::fs::{FileServer, TempFile};
use rocket::form::Form;
use rocket::serde::{Serialize, Deserialize, json::Json};
use dotenv::dotenv;
use std::{env, fmt};
use rocket::{State};
use rocket::{figment::{Figment, providers::Env}, Config as RocketConfig };
use rocket::data::{Limits, ToByteUnit};
use tokio_util::codec::{FramedRead, BytesCodec};
use tokio::fs::File;
use futures_util::TryStreamExt;
use futures_util::TryFutureExt;
use rocket_multipart_form_data::multer::bytes::BytesMut;
use rocket::http::hyper::Body;
use std::path::Path;
use std::error::Error;
use pyo3::basic::CompareOp::Ge;

struct Config {
    pub static_path: String,
    pub python_path: String,
    pub gentle_address: String,
    pub gentle_port: u16,
    pub port: u16
}

impl Config {
    pub fn new() -> Config {
        dotenv().ok();

        Config {
            static_path: env::var("STATIC_PATH").expect("STATIC_PATH missing in env variables. .env not existing?"),
            python_path: env::var("PYTHON_PATH").expect("PYTHON_PATH missing in env variables. .env not existing?"),
            port: env::var("PORT").or(Ok("8000".to_string())).and_then(|port| port.parse::<u16>()).expect("PORT not a number"),
            gentle_address: env::var("GENTLE_ADDRESS").unwrap_or("http://127.0.0.1".to_string()),
            gentle_port: env::var("GENTLE_PORT").or(Ok("8765".to_string())).and_then(|port| port.parse::<u16>()).expect("GENTLE_PORT not a number")
        }
    }
}

#[launch]
fn rocket() -> _ {
    let config = Config::new();
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

#[derive(FromForm)]
struct AudioUpload<'f> {
    recording: TempFile<'f>
}

#[derive(Serialize)]
#[derive(FromPyObject)]
struct AudioResult {
    text: String,
    phonemes: Vec<Vec<String>>,
    seconds: f32
}

#[derive(Responder, Debug, Clone)]
#[response(status = 500, content_type = "json")]
struct CustomError(String);

impl fmt::Display for CustomError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

#[post("/audio", data = "<data>")]
async fn api_phonemise_audio(data: Form<AudioUpload<'_>>, config: &State<Config>) -> Result<Json<AudioResult>, CustomError> {
    match data.recording.path() {
        Some(path) => {
            phonemise_audio(config, path.as_os_str().to_os_string().into_string().unwrap())
                .map(|audio_result| Json(audio_result))
                .map_err(|e| CustomError(format!("{:?}", e)))
        },
        None => Err(CustomError("Something went wrong, file was not saved in a temp location, try again".to_string()))
    }
}

#[post("/audio/advanced", data = "<data>")]
async fn api_phonemise_audio_advanced(data: Form<AudioUpload<'_>>, config: &State<Config>) -> Result<Json<GentleResult>, CustomError> {
    match data.recording.path() {
        Some(path) => {
            match transcribe_audio(config, path.to_string_lossy().to_string()) {
                Ok(transcription) => {
                    phonemise_advanced(
                        config,
                        path.to_string_lossy().to_string(),
                        transcription
                    ).await.map(|gentle_result| Json(gentle_result))
                },
                Err(e) => Err(CustomError(format!("An error occurred {:?}", e)))
            }
        },
        None => Err(CustomError("Something went wrong, file was not saved in a temp location, try again".to_string()))
    }
}

async fn phonemise_advanced(config: &Config, audio_path: String, transcript: String) -> Result<GentleResult, CustomError> {
    let stream = File::open(audio_path)
        .map_ok(|file| FramedRead::new(file, BytesCodec::new()).map_ok(BytesMut::freeze))
        .try_flatten_stream();
    let client = reqwest::Client::new();
    let file_part = reqwest::multipart::Part::stream(Body::wrap_stream(stream));
    let form = reqwest::multipart::Form::new()
        .text("transcript", transcript.clone())
        .part("audio", file_part);


    let mut result = client.post(format!("{}:{}/transcriptions?async=false", config.gentle_address.clone(), config.gentle_port.clone()))
        .multipart(form)
        .send()
        .await.map_err(|_| CustomError("Couldn't contact lowerquality gentle".to_string()))?
        .json::<GentleResult>()
        .await.map_err(|_| CustomError("Couldn't parse json from lowerquality gentle".to_string()))?;

    let mut final_result: GentleResult = GentleResult {
        words: vec![],
        transcript: transcript
    };

    for mut word in result.words {
        if word.alignedWord == "<unk>" {
            let mut new_word = word.clone();
            let phonemes = phonemise_text(config, word.word.clone()).map_err(|_| CustomError("Couldn't phonemise a word".to_string()))?;
            new_word.alignedWord = word.word;
            let mut new_phonemes: Vec<GentlePhoneme> = vec![];
            let all_phonemes: Vec<String> = flat_map(phonemes.phonemes);
            let phonemes_count = all_phonemes.len();
            for phoneme in all_phonemes {
                new_phonemes.push(GentlePhoneme {
                    phone: cmu_to_gentle_phoneme(phoneme),
                    duration: (word.end - word.start) / (phonemes_count as f32)
                })
            }
            new_word.phones = new_phonemes;
            final_result.words.push(new_word)
        } else {
            final_result.words.push(word.clone())
        }
    }

    Ok(final_result)
}

fn cmu_to_gentle_phoneme(phoneme: String) -> String {
    format!("{}_", phoneme)
}

fn flat_map(to_flat: Vec<Vec<String>>) -> Vec<String> {
    let mut new_vec = vec![];

    for list in to_flat {
        for item in list {
            new_vec.push(item);
        }
    }

    new_vec
}

#[derive(FromForm)]
struct AudioWithTextUpload<'f> {
    recording: TempFile<'f>,
    text: String
}

#[post("/text/advanced", data = "<data>")]
async fn api_phonemise_text_advanced(data: Form<AudioWithTextUpload<'_>>, config: &State<Config>) -> Result<Json<GentleResult>, CustomError> {
    let transcription = data.text.clone();

    match data.recording.path() {
        Some(path) => {
            phonemise_advanced(
                config,
                path.to_string_lossy().to_string(),
                transcription
            ).await.map(|gentle_result| Json(gentle_result))
        },
        None => Err(CustomError("Something went wrong, file was not saved in a temp location, try again".to_string()))
    }
}

#[derive(FromForm)]
struct Text {
    text: String
}

#[derive(Serialize)]
#[derive(FromPyObject)]
struct TextResult {
    text: String,
    phonemes: Vec<Vec<String>>
}

#[derive(Serialize, Deserialize, Clone)]
struct GentleResult {
    transcript: String,
    words: Vec<GentleWord>
}

#[derive(Serialize, Deserialize, Clone)]
struct GentleWord {
    alignedWord: String,
    case: String,
    word: String,
    end: f32,
    start: f32,
    endOffset: i16,
    startOffset: i16,
    phones: Vec<GentlePhoneme>
}

#[derive(Serialize, Deserialize, Clone)]
struct GentlePhoneme {
    duration: f32,
    phone: String
}

#[post("/text", data = "<data>")]
async fn api_phonemise_text(data: Form<Text>, config: &State<Config>) -> Result<Json<TextResult>, CustomError> {
    phonemise_text(config, data.text.clone())
        .map(|result| Json(result))
        .map_err(|e| CustomError(format!("{:?}", e)))
}

fn phonemise_text(config: &Config, text: String) -> Result<TextResult, impl Error> {
    let result: PyResult<Vec<Vec<String>>> = Python::with_gil(|py| {
        let syspath: &PyList = PyModule::import(py, "sys")?
            .getattr("path")?
            .try_into()?;

        syspath.insert(0, config.python_path.clone())
            .unwrap();

        let phonemiser: &PyModule = PyModule::import(py, "phonemiser")?;
        let call_result: Vec<Vec<String>> = phonemiser.getattr("phonemise_text")?.call1((text.clone(), ))?.extract()?;
        Ok(call_result)
    });

    result.map(|phonemes| TextResult { phonemes, text: text })
}

fn phonemise_audio(config: &Config, audio_path: String) -> Result<AudioResult, PyErr> {
    Python::with_gil(|py| {
        let syspath: &PyList = PyModule::import(py, "sys")?
            .getattr("path")?
            .try_into()?;

        syspath.insert(0, config.python_path.clone())
            .unwrap();

        let phonemiser: &PyModule = PyModule::import(py, "phonemiser")?;
        let call_result: AudioResult = phonemiser.getattr("phonemise_audio")?.call1((audio_path, ))?.extract()?;
        Ok(call_result)
    })
}

fn transcribe_audio(config: &Config, audio_path: String) -> Result<String, PyErr> {
    Python::with_gil(|py| {
        let syspath: &PyList = PyModule::import(py, "sys")?
            .getattr("path")?
            .try_into()?;

        syspath.insert(0, config.python_path.clone())
            .unwrap();

        let phonemiser: &PyModule = PyModule::import(py, "phonemiser")?;
        let call_result: String = phonemiser.getattr("transcribe_audio")?.call1((audio_path, ))?.extract()?;
        Ok(call_result)
    })
}
