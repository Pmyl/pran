use pran_phonemes_core::phonemes::phonemise_text;
use pran_droid_core::application::brain::pran_droid_brain::TextPhonemiser;

pub struct PranTextPhonemiser {}

impl TextPhonemiser for PranTextPhonemiser {
    fn phonemise_text(&self, text: &str) -> Vec<String> {
        debug!("Start phonemise {}", text);
        let result = phonemise_text(text.to_string()).unwrap().phonemes.into_iter().flat_map(|s| s).collect();
        debug!("End phonemise {:?}", &result);

        result
    }
}