#[macro_use] extern crate rocket;
extern crate dotenv;

use pyo3::prelude::*;
use pyo3::types::{PyList};
use rocket::fs::{FileServer, TempFile};
use rocket::form::Form;
use rocket::serde::{Serialize, json::Json};
use dotenv::dotenv;
use std::{env, fmt};
use rocket::State;
use std::path::Path;
use rocket::figment::Figment;

struct Config {
    pub static_path: String,
    pub python_path: String,
    pub port: u16
}

impl Config {
    pub fn new() -> Config {
        dotenv().ok();

        Config {
            static_path: env::var("STATIC_PATH").expect("STATIC_PATH missing in env variables. .env not existing?"),
            python_path: env::var("PYTHON_PATH").expect("PYTHON_PATH missing in env variables. .env not existing?"),
            port: env::var("PORT").or(Ok("8000".to_string())).and_then(|port| port.parse::<u16>()).expect("PORT not a number")
        }
    }
}

#[launch]
fn rocket() -> _ {
    let config = Config::new();
    let static_path = config.static_path.clone();

    let figment = Figment::from(rocket::Config::default())
        .merge((Config::PORT, config.port));

    pyo3::prepare_freethreaded_python();
    rocket::custom(figment)
        .manage(config)
        .mount("/", FileServer::from(static_path))
        .mount("/api", routes![phonemise_audio, phonemise_text, python_check, python_check_identity])
}

#[derive(FromForm)]
struct Upload<'f> {
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
async fn phonemise_audio(data: Form<Upload<'_>>, config: &State<Config>) -> Result<Json<AudioResult>, CustomError> {
    match data.recording.path() {
        Some(path) => {
            let path_string = path.as_os_str().to_os_string().into_string().unwrap();
            let result: PyResult<AudioResult> = Python::with_gil(|py| {
                let syspath: &PyList = PyModule::import(py, "sys")?
                    .getattr("path")?
                    .try_into()?;

                syspath.insert(0, config.python_path.clone())
                    .unwrap();

                let phonemiser: &PyModule = PyModule::import(py, "phonemiser")?;
                let call_result: AudioResult = phonemiser.getattr("phonemise_audio")?.call1((path_string, ))?.extract()?;
                Ok(call_result)
            });
            result.map(|audio_result| Json(audio_result)).map_err(|e| CustomError(format!("{:?}", e)))
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

#[post("/text", data = "<data>")]
async fn phonemise_text(data: Form<Text>, config: &State<Config>) -> Result<Json<TextResult>, CustomError> {
    let result: PyResult<Vec<Vec<String>>> = Python::with_gil(|py| {
        let syspath: &PyList = PyModule::import(py, "sys")?
            .getattr("path")?
            .try_into()?;

        syspath.insert(0, config.python_path.clone())
            .unwrap();

        let phonemiser: &PyModule = PyModule::import(py, "phonemiser")?;
        let call_result: Vec<Vec<String>> = phonemiser.getattr("phonemise_text")?.call1((data.text.clone(), ))?.extract()?;
        Ok(call_result)
    });

    result
        .map(|phonemes| TextResult { phonemes, text: data.text.clone() })
        .map(|text_result| Json(text_result))
        .map_err(|e| CustomError(format!("{:?}", e)))
}


#[get("/pythoncheck")]
async fn python_check(config: &State<Config>) -> Result<String, CustomError> {
    let result: PyResult<String> = Python::with_gil(|py| {
        let module = PyModule::from_code(
            py,
            include_str!("check.py"),
            "check.py",
            "check"
        )?;
        let call_result: String = module.getattr("python_check")?.call0()?.extract()?;
        Ok(call_result)
    });

    result.map_err(|e| CustomError(format!("{:?}", e)))
}


#[get("/pythoncheckidentity")]
async fn python_check_identity(config: &State<Config>) -> Result<String, CustomError> {
    let result: PyResult<String> = Python::with_gil(|py| {
        let syspath: &PyList = PyModule::import(py, "sys")?
            .getattr("path")?
            .try_into()?;

        syspath.insert(0, config.python_path.clone())
            .unwrap();

        let phonemiser: &PyModule = PyModule::import(py, "check")?;
        let call_result: String = phonemiser.getattr("python_check_identity")?.call1(("identity works", ))?.extract()?;
        Ok(call_result)
    });

    result.map_err(|e| CustomError(format!("{:?}", e)))
}
