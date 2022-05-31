use rocket::serde::{Serialize, Deserialize};
use futures_util::TryStreamExt;
use futures_util::TryFutureExt;
use pran_phonemes_core::phonemes::audio_seconds;
use rocket_multipart_form_data::multer::bytes::BytesMut;
use tokio::fs::File;
use tokio_util::codec::{FramedRead, BytesCodec};
use rocket::http::hyper::Body;
use crate::core::config::Config;
use crate::core::flat::flat;
use crate::errors::custom_error::CustomError;
use crate::{phonemise_text};
use crate::core::phoneme::cmu_to_gentle_phoneme;

#[derive(Serialize, Deserialize, Clone)]
pub struct GentleResult {
    pub duration: f32,
    pub transcript: String,
    pub words: Vec<GentleWord>
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GentleWord {
    #[serde(rename(deserialize = "alignedWord"))]
    pub aligned_word: String,
    pub case: String,
    pub word: String,
    pub end: f32,
    pub start: f32,
    #[serde(rename(deserialize = "endOffset"))]
    pub end_offset: i16,
    #[serde(rename(deserialize = "startOffset"))]
    pub start_offset: i16,
    pub phones: Vec<GentlePhoneme>
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GentleApiResult {
    pub transcript: String,
    pub words: Vec<GentleApiWordResult>
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(tag = "case")]
pub enum GentleApiWordResult {
    #[serde(rename = "success")]
    Success(GentleApiSuccessWord),
    #[serde(rename = "not-found-in-audio")]
    NotFoundInAudio(GentleApiNotFoundWord)
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GentleApiSuccessWord {
    #[serde(rename(deserialize = "alignedWord"))]
    pub aligned_word: String,
    pub word: String,
    pub end: f32,
    pub start: f32,
    #[serde(rename(deserialize = "endOffset"))]
    pub end_offset: i16,
    #[serde(rename(deserialize = "startOffset"))]
    pub start_offset: i16,
    pub phones: Vec<GentlePhoneme>
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GentleApiNotFoundWord {
    pub word: String,
    #[serde(rename(deserialize = "endOffset"))]
    pub end_offset: i16,
    #[serde(rename(deserialize = "startOffset"))]
    pub start_offset: i16
}

impl Into<GentleWord> for &GentleApiSuccessWord {
    fn into(self) -> GentleWord {
        GentleWord {
            case: "success".to_string(),
            end: self.end,
            end_offset: self.end_offset,
            start: self.start,
            start_offset: self.start_offset,
            aligned_word: self.aligned_word.clone(),
            phones: self.phones.clone(),
            word: self.word.clone()
        }
    }
}

impl GentleApiNotFoundWord {
    fn into_word(&self, prev_word_option: Option<&GentleWord>, next_word_result_option: Option<&GentleApiWordResult>) -> GentleWord {
        let start = match prev_word_option {
            Some(prev_word) => prev_word.end + 0.01,
            None => 0 as f32
        };

        let end = match next_word_result_option {
            Some(GentleApiWordResult::Success(next_word)) => (next_word.start - 0.01).max(0 as f32),
            _ => match prev_word_option {
                Some(prev_word) => prev_word.end + 1.01,
                None => 1 as f32
            }
        };

        let word = GentleWord {
            case: "not-found-in-audio".to_string(),
            end_offset: self.end_offset,
            start,
            end,
            start_offset: self.start_offset,
            aligned_word: "<unk>".to_string(),
            phones: vec![],
            word: self.word.clone()
        };
        
        println!("{:?}", word);
        
        word
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GentlePhoneme {
    pub duration: f32,
    pub phone: String
}

pub async fn phonemise_gentle(config: &Config, audio_path: String, transcript: String) -> Result<GentleResult, CustomError> {
    let stream = File::open(audio_path.clone())
        .map_ok(|file| FramedRead::new(file, BytesCodec::new()).map_ok(BytesMut::freeze))
        .try_flatten_stream();
    let client = reqwest::Client::new();
    let file_part = reqwest::multipart::Part::stream(Body::wrap_stream(stream));
    let form = reqwest::multipart::Form::new()
        .text("transcript", transcript.clone())
        .part("audio", file_part);

    let result = client.post(format!("{}:{}/transcriptions?async=false", config.gentle_address.clone(), config.gentle_port.clone()))
        .multipart(form)
        .send()
        .await.map_err(|_| CustomError("Couldn't contact lowerquality gentle".to_string()))?
        .json::<GentleApiResult>()
        .await.map_err(|error| CustomError(format!("Couldn't parse json from lowerquality gentle.\n\r\n\r{}", error.to_string())))?;

    let mut final_result: GentleResult = GentleResult {
        duration: audio_seconds(audio_path).map_err(|_| CustomError("Couldn't calculate audio length".to_string()))?,
        words: vec![],
        transcript
    };
    
    for i in 0..result.words.len() {
        let word = &result.words[i];

        final_result.words.push(match word {
            GentleApiWordResult::Success(unknown_word) if unknown_word.aligned_word == "<unk>" => phonemise_unknown_word(unknown_word.into())?,
            GentleApiWordResult::Success(found_word) => found_word.into(),
            GentleApiWordResult::NotFoundInAudio(not_found_word) => phonemise_unknown_word(
                not_found_word.into_word(
                    final_result.words.last(),
                    if i + 1 >= result.words.len() {
                        None
                    } else {
                        Some(&result.words[i + 1])
                    }
                )
            )?
        });
    }

    Ok(final_result)
}

fn phonemise_unknown_word(word: GentleWord) -> Result<GentleWord, CustomError> {
    let mut new_word = word.clone();
    let phonemes = phonemise_text(word.word.clone()).map_err(|_| CustomError("Couldn't phonemise a word".to_string()))?;
    new_word.aligned_word = word.word;
    let mut new_phonemes: Vec<GentlePhoneme> = vec![];
    let all_phonemes: Vec<String> = flat(phonemes.phonemes);
    let phonemes_count = all_phonemes.len();
    for phoneme in all_phonemes {
        new_phonemes.push(GentlePhoneme {
            phone: cmu_to_gentle_phoneme(phoneme),
            duration: (word.end - word.start) / (phonemes_count as f32)
        })
    }
    new_word.phones = new_phonemes;
    
    Ok(new_word)
}