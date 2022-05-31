use pran_phonemes_core::phonemes::{PhonemiseAudioResult, PhonemiseTextResult};
use rocket::serde::{Serialize, Deserialize};
use crate::core::flat::flat;
use crate::core::phoneme::cmu_to_gentle_phoneme;
use crate::gentle::gentle_api::{GentlePhoneme, GentleResult, GentleWord};

#[derive(Serialize, Deserialize, Clone)]
pub struct PhonemisationResult {
    pub duration: f32,
    pub transcript: String,
    pub words: Vec<ResultWord>
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ResultWord {
    pub word: String,
    pub end: f32,
    pub start: f32,
    pub phones: Vec<ResultPhoneme>
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ResultPhoneme {
    pub duration: f32,
    pub phone: String
}

impl From::<GentleResult> for PhonemisationResult {
    fn from(gentle_result: GentleResult) -> Self {
        PhonemisationResult {
            duration: gentle_result.duration,
            transcript: gentle_result.transcript,
            words: gentle_result.words.into_iter().map(|word| word.into()).collect()
        }
    }
}

impl From::<GentleWord> for ResultWord {
    fn from(gentle_word: GentleWord) -> Self {
        ResultWord {
            word: gentle_word.word,
            start: gentle_word.start,
            end: gentle_word.end,
            phones: gentle_word.phones.into_iter().map(|phone| phone.into()).collect()
        }
    }
}

impl From::<GentlePhoneme> for ResultPhoneme {
    fn from(gentle_phoneme: GentlePhoneme) -> Self {
        ResultPhoneme {
            duration: gentle_phoneme.duration,
            phone: gentle_phoneme.phone
        }
    }
}

impl From::<PhonemiseAudioResult> for PhonemisationResult {
    fn from(python_audio_result: PhonemiseAudioResult) -> Self {
        let all_phonemes = flat(python_audio_result.phonemes);
        let phoneme_average_duration = python_audio_result.seconds / all_phonemes.len() as f32;

        PhonemisationResult {
            duration: python_audio_result.seconds,
            transcript: python_audio_result.text.clone(),
            words: vec![ResultWord {
                word: python_audio_result.text,
                start: 0 as f32,
                end: python_audio_result.seconds,
                phones: all_phonemes.into_iter().map(|phoneme| ResultPhoneme {
                    phone: cmu_to_gentle_phoneme(phoneme),
                    duration: phoneme_average_duration
                }).collect()
            }]
        }
    }
}

impl From::<PhonemiseTextResult> for PhonemisationResult {
    fn from(text_result: PhonemiseTextResult) -> Self {
        let phoneme_average_duration = 0.1;
        let end_wait = 0.5;
        let all_phonemes = flat(text_result.phonemes);

        PhonemisationResult {
            duration: all_phonemes.len() as f32 * phoneme_average_duration + end_wait,
            transcript: text_result.text.clone(),
            words: vec![ResultWord {
                word: text_result.text,
                start: 0 as f32,
                end: all_phonemes.len() as f32 * phoneme_average_duration,
                phones: all_phonemes.into_iter().map(|phoneme| ResultPhoneme {
                    phone: cmu_to_gentle_phoneme(phoneme),
                    duration: phoneme_average_duration
                }).collect()
            }]
        }
    }
}
