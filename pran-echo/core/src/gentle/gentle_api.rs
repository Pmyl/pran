use rocket::serde::{Serialize, Deserialize};
use futures_util::TryStreamExt;
use futures_util::TryFutureExt;
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
    pub transcript: String,
    pub words: Vec<GentleWord>
}

#[derive(Serialize, Deserialize, Clone)]
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

#[derive(Serialize, Deserialize, Clone)]
pub struct GentlePhoneme {
    pub duration: f32,
    pub phone: String
}

pub async fn phonemise_gentle(config: &Config, audio_path: String, transcript: String) -> Result<GentleResult, CustomError> {
    let stream = File::open(audio_path)
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
        .json::<GentleResult>()
        .await.map_err(|_| CustomError("Couldn't parse json from lowerquality gentle".to_string()))?;

    let mut final_result: GentleResult = GentleResult {
        words: vec![],
        transcript
    };

    for word in result.words {
        if word.aligned_word == "<unk>" {
            let mut new_word = word.clone();
            let phonemes = phonemise_text(config, word.word.clone()).map_err(|_| CustomError("Couldn't phonemise a word".to_string()))?;
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
            final_result.words.push(new_word)
        } else {
            final_result.words.push(word.clone())
        }
    }

    Ok(final_result)
}
