#[cfg(feature="audio")]
use std::{env};
#[cfg(feature="audio")]
use pyo3::prelude::*;
#[cfg(feature="audio")]
use pyo3::types::PyList;
use std::borrow::Borrow;
use dotenv::dotenv;
use grapheme_to_phoneme::GraphToPhoneError;
use lazy_static::lazy_static;

lazy_static! {
    static ref ARPABET: grapheme_to_phoneme::arpabet::Arpabet = grapheme_to_phoneme::arpabet::Arpabet::new();
    static ref GRAPHEME_TO_PHONEME: grapheme_to_phoneme::Model = grapheme_to_phoneme::Model::load_in_memory().unwrap();
}

#[cfg(feature="audio")]
#[derive(FromPyObject)]
pub struct PhonemiseAudioResult {
    pub text: String,
    pub phonemes: Vec<Vec<String>>,
    pub seconds: f32
}

pub struct PhonemiseTextResult {
    pub text: String,
    pub phonemes: Vec<Vec<String>>
}

pub fn pran_phonemes() -> Result<(), ()> {
    dotenv().ok();
    setup();
    Ok(())
}

#[cfg(feature="audio")]
fn setup() {
    pyo3::prepare_freethreaded_python();
    env::var("PRAN_PHONEMES_PYTHON_PATH").expect("PRAN_PHONEMES_PYTHON_PATH missing in env variables.");
}

#[cfg(not(feature="audio"))]
fn setup() {}

#[cfg(feature="audio")]
pub fn transcribe_audio(audio_path: String) -> Result<String, PyErr> {
    Python::with_gil(|py| {
        let phonemiser: &PyModule = setup_phonemiser_python(py)?;
        let call_result: String = phonemiser.getattr("transcribe_audio")?.call1((audio_path, ))?.extract()?;
        Ok(call_result)
    })
}

pub fn phonemise_text(text: String) -> Result<PhonemiseTextResult, GraphToPhoneError> {
    let mut result: Vec<Vec<String>> = vec![];
    for word in text.split_whitespace() {
        let arpabet_result = ARPABET.borrow().get_polyphone_str(word)
            .map(|phonemes| phonemes.into_iter().map(remove_digit).collect());

        if let Some(arpabet_result) = arpabet_result {
            result.push(arpabet_result);
        } else {
            result.push(GRAPHEME_TO_PHONEME.borrow().predict_phonemes_strs(word)?.into_iter().map(remove_digit).collect::<Vec<String>>());
        }
    }

    Ok(PhonemiseTextResult { phonemes: result, text })
}

fn remove_digit(phoneme: &str) -> String {
    if phoneme.chars().last().unwrap().is_numeric() {
        phoneme[..phoneme.len() - 1].to_string()
    } else {
        phoneme.to_string()
    }
}

#[cfg(feature="audio")]
pub fn phonemise_audio(audio_path: String) -> Result<PhonemiseAudioResult, PyErr> {
    Python::with_gil(|py| {
        let phonemiser: &PyModule = setup_phonemiser_python(py)?;
        let call_result: PhonemiseAudioResult = phonemiser.getattr("phonemise_audio")?.call1((audio_path, ))?.extract()?;
        Ok(call_result)
    })
}

#[cfg(feature="audio")]
pub fn audio_seconds(audio_path: String) -> Result<f32, PyErr> {
    Python::with_gil(|py| {
        let phonemiser: &PyModule = setup_phonemiser_python(py)?;
        let call_result: f32 = phonemiser.getattr("audio_seconds")?.call1((audio_path, ))?.extract()?;
        Ok(call_result)
    })
}

#[cfg(feature="audio")]
fn setup_phonemiser_python(py: Python) -> Result<&PyModule, PyErr> {
    let syspath: &PyList = PyModule::import(py, "sys")?
        .getattr("path")?
        .try_into()?;

    syspath.insert(0, env::var("PRAN_PHONEMES_PYTHON_PATH").expect("PRAN_PHONEMES_PYTHON_PATH missing in env variables."))
        .unwrap();

    PyModule::import(py, "phonemiser")
}