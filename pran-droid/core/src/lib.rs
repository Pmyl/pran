use std::error::Error;
use pran_phonemes_core::phonemes::pran_phonemes;

pub mod application;
pub mod domain;
pub mod persistence;

pub fn init() -> Result<(), impl Error> {
    pran_phonemes()
}