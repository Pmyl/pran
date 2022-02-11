use rocket::serde::{Serialize};
use std::error::Error;
use pyo3::prelude::*;
use pyo3::types::PyList;
use crate::core::config::Config;

#[derive(Serialize)]
#[derive(FromPyObject)]
pub struct PythonAudioResult {
    pub text: String,
    pub phonemes: Vec<Vec<String>>,
    pub seconds: f32
}

#[derive(Serialize)]
#[derive(FromPyObject)]
pub struct TextResult {
    pub text: String,
    pub phonemes: Vec<Vec<String>>
}

pub fn transcribe_audio(config: &Config, audio_path: String) -> Result<String, PyErr> {
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

pub fn phonemise_text(config: &Config, text: String) -> Result<TextResult, impl Error> {
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

pub fn phonemise_audio(config: &Config, audio_path: String) -> Result<PythonAudioResult, PyErr> {
    Python::with_gil(|py| {
        let syspath: &PyList = PyModule::import(py, "sys")?
            .getattr("path")?
            .try_into()?;

        syspath.insert(0, config.python_path.clone())
            .unwrap();

        let phonemiser: &PyModule = PyModule::import(py, "phonemiser")?;
        let call_result: PythonAudioResult = phonemiser.getattr("phonemise_audio")?.call1((audio_path, ))?.extract()?;
        Ok(call_result)
    })
}