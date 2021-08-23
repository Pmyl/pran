#[macro_use] extern crate rocket;
extern crate dotenv;

use pyo3::prelude::*;
use pyo3::types::{PyList};
use rocket::fs::{FileServer, relative, TempFile};
use rocket::form::Form;
use rocket::serde::{Serialize, json::Json};
use dotenv::dotenv;
use std::{env, fmt};
use rocket::State;

struct Config {
    pub static_path: String,
    pub python_path: String
}

impl Config {
    pub fn new() -> Config {
        dotenv().ok();

        Config {
            static_path: env::var("STATIC_PATH").expect("STATIC_PATH missing in env variables. .env not existing?"),
            python_path: env::var("PYTHON_PATH").expect("PYTHON_PATH missing in env variables. .env not existing?")
        }
    }
}

#[launch]
fn rocket() -> _ {
    let config = Config::new();
    let static_path = config.static_path.clone();

    pyo3::prepare_freethreaded_python();
    rocket::build()
        .manage(config)
        .mount("/", FileServer::from(static_path))
        .mount("/api", routes![upload])
}

#[derive(FromForm)]
struct Upload<'f> {
    recording: TempFile<'f>
}

#[derive(Serialize)]
#[derive(FromPyObject)]
struct AudioResult {
    text: String,
    phonemes: String
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
async fn upload(data: Form<Upload<'_>>, config: &State<Config>) -> Result<Json<AudioResult>, CustomError> {
    match data.recording.path() {
        Some(path) => {
            let path_string = path.as_os_str().to_os_string().into_string().unwrap();
            let result: PyResult<AudioResult> = Python::with_gil(|py| {
                let syspath: &PyList = PyModule::import(py, "sys")?
                    .getattr("path")?
                    .try_into()?;

                syspath.insert(0, config.python_path.clone())
                    .unwrap();

                let fibo: &PyModule = PyModule::import(py, "phonemiser")?;
                let call_result: AudioResult = fibo.getattr("phonemise_audio")?.call1((path_string, ))?.extract()?;
                Ok(call_result)
            });
            result.map(|audio_result| Json(audio_result)).map_err(|e| CustomError(format!("{:?}", e)))
        },
        None => Err(CustomError("Something went wrong, file was not saved in a temp location, try again".to_string()))
    }
}
