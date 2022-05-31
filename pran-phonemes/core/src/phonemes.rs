use dotenv::dotenv;
use std::{env};
use std::error::Error;
use std::path::PathBuf;
use pyo3::prelude::*;
use pyo3::types::PyList;

#[derive(FromPyObject)]
pub struct PhonemiseAudioResult {
    pub text: String,
    pub phonemes: Vec<Vec<String>>,
    pub seconds: f32
}

#[derive(FromPyObject)]
pub struct PhonemiseTextResult {
    pub text: String,
    pub phonemes: Vec<Vec<String>>
}

pub fn pran_phonemes() -> dotenv::Result<PathBuf> {
    pyo3::prepare_freethreaded_python();
    dotenv()
}

pub fn transcribe_audio(audio_path: String) -> Result<String, PyErr> {
    Python::with_gil(|py| {
        let phonemiser: &PyModule = setup_phonemiser_python(py)?;
        let call_result: String = phonemiser.getattr("transcribe_audio")?.call1((audio_path, ))?.extract()?;
        Ok(call_result)
    })
}

pub fn phonemise_text(text: String) -> Result<PhonemiseTextResult, impl Error> {
    let result: PyResult<Vec<Vec<String>>> = Python::with_gil(|py| {
        let phonemiser: &PyModule = setup_phonemiser_python(py)?;
        let call_result: Vec<Vec<String>> = phonemiser.getattr("phonemise_text")?.call1((text.clone(), ))?.extract()?;
        Ok(call_result)
    });

    result.map(|phonemes| PhonemiseTextResult { phonemes, text: text })
}

pub fn phonemise_audio(audio_path: String) -> Result<PhonemiseAudioResult, PyErr> {
    Python::with_gil(|py| {
        let phonemiser: &PyModule = setup_phonemiser_python(py)?;
        let call_result: PhonemiseAudioResult = phonemiser.getattr("phonemise_audio")?.call1((audio_path, ))?.extract()?;
        Ok(call_result)
    })
}

pub fn audio_seconds(audio_path: String) -> Result<f32, PyErr> {
    Python::with_gil(|py| {
        let phonemiser: &PyModule = setup_phonemiser_python(py)?;
        let call_result: f32 = phonemiser.getattr("audio_seconds")?.call1((audio_path, ))?.extract()?;
        Ok(call_result)
    })
}

fn setup_phonemiser_python(py: Python) -> Result<&PyModule, PyErr> {
    let syspath: &PyList = PyModule::import(py, "sys")?
        .getattr("path")?
        .try_into()?;

    syspath.insert(0, env::var("PRAN_PHONEMES_PYTHON_PATH").expect("PRAN_PHONEMES_PYTHON_PATH missing in env variables."))
        .unwrap();

    PyModule::import(py, "phonemiser")
}