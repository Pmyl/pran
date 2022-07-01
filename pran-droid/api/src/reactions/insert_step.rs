use std::sync::Arc;
use rocket::response::{Responder, status};
use rocket::serde::json::Json;
use rocket::serde::Deserialize;
use rocket::{Request, response, State};
use rocket::http::Status;
use pran_droid_core::application::reactions::dtos::reaction_step_dto::{ReactionStepTextAlternativeDto, ReactionStepTextDto};
use pran_droid_core::application::reactions::insert_movement_step::{AddMovementStepToReactionError, insert_movement_step_to_reaction, InsertMovementStepToReactionRequest};
use pran_droid_core::application::reactions::insert_talking_step::{AddTalkingStepToReactionError, insert_talking_step_to_reaction, InsertTalkingStepToReactionRequest};
use pran_droid_core::domain::emotions::emotion_repository::EmotionRepository;
use pran_droid_core::domain::reactions::reaction_definition_repository::{ReactionDefinitionRepository};
use pran_droid_core::domain::images::image_repository::ImageRepository;
use crate::infrastructure::authenticated::Authenticated;
use crate::reactions::models::reaction_step_model::{AnimationFrameModel, from_model_to_dto, ReactionStepModel, ReactionStepSkipModel, ReactionStepTextAlternativeModel, ReactionStepTextModel};

#[put("/reactions/<reaction_id>/steps", format = "json", data = "<payload>")]
pub async fn api_insert_reaction_step(_authenticated: Authenticated, reaction_id: String, payload: Json<InsertReactionStepApiRequest>, repo: &State<Arc<dyn ReactionDefinitionRepository>>, image_repo: &State<Arc<dyn ImageRepository>>, emotion_repo: &State<Arc<dyn EmotionRepository>>) -> Result<Json<ReactionStepModel>, Error> {
    match payload {
        Json(InsertReactionStepApiRequest::Moving(request)) => {
            Ok(Json(insert_movement_step_to_reaction(request.into_request(reaction_id), repo, image_repo).await?.into()))
        },
        Json(InsertReactionStepApiRequest::Talking(request)) => {
            Ok(Json(insert_talking_step_to_reaction(request.into_request(reaction_id), repo, emotion_repo).await?.into()))
        }
    }
}

#[derive(Deserialize)]
#[serde(untagged)]
pub enum InsertReactionStepApiRequest {
    Moving(InsertReactionMovingStepApiRequest),
    Talking(InsertReactionTalkingStepApiRequest),
}


#[derive(Deserialize)]
pub struct InsertReactionMovingStepApiRequest {
    index: usize,
    skip: Option<ReactionStepSkipModel>,
    animation: Vec<AnimationFrameModel>
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InsertReactionTalkingStepApiRequest {
    index: usize,
    skip: Option<ReactionStepSkipModel>,
    emotion_id: String,
    text: Vec<ReactionStepTextAlternativeModel>
}

impl InsertReactionMovingStepApiRequest {
    fn into_request(self, reaction_id: String) -> InsertMovementStepToReactionRequest {
        InsertMovementStepToReactionRequest {
            reaction_id,
            step_index: self.index,
            skip: from_model_to_dto(self.skip),
            animation: self.animation.into_iter().map(Into::into).collect()
        }
    }
}

impl InsertReactionTalkingStepApiRequest {
    fn into_request(self, reaction_id: String) -> InsertTalkingStepToReactionRequest {
        InsertTalkingStepToReactionRequest {
            reaction_id,
            step_index: self.index,
            skip: from_model_to_dto(self.skip),
            emotion_id: self.emotion_id,
            text: self.text
                .iter()
                .map(|alternative| ReactionStepTextAlternativeDto {
                    text: match &alternative.text {
                        ReactionStepTextModel::Instant { text } => ReactionStepTextDto::Instant(text.clone()),
                        ReactionStepTextModel::LetterByLetter { text } => ReactionStepTextDto::LetterByLetter(text.clone()),
                    },
                    probability: alternative.probability,
                }).collect()
        }
    }
}

#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("{0:?}")]
    AddMovementStepToReactionError(#[from] AddMovementStepToReactionError),
    #[error("{0:?}")]
    AddTalkingStepToReactionError(#[from] AddTalkingStepToReactionError),
    #[error("Not matching request")]
    NotMatchingRequest,
}

impl<'r, 'o: 'r> Responder<'r, 'o> for Error {
    fn respond_to(self, req: &'r Request<'_>) -> response::Result<'o> {
        match self {
            Error::AddMovementStepToReactionError(error) => {
                match error {
                    AddMovementStepToReactionError::WrongAnimationRequest(internal_error) =>
                        status::BadRequest(Some(format!("{:?}", internal_error))).respond_to(req),
                    AddMovementStepToReactionError::BadImageRequest(internal_error) =>
                        status::BadRequest(Some(format!("{:?}", internal_error))).respond_to(req),
                    AddMovementStepToReactionError::BadRequest(msg) => status::BadRequest(Some(msg)).respond_to(req),
                }
            },
            Error::AddTalkingStepToReactionError(error) => {
                match error {
                    AddTalkingStepToReactionError::BadEmotionRequest(internal_error) =>
                        status::BadRequest(Some(format!("{:?}", internal_error))).respond_to(req),
                    AddTalkingStepToReactionError::BadRequest(msg) => status::BadRequest(Some(msg)).respond_to(req),
                }
            },
            _ => Status::NotFound.respond_to(req)
        }
    }
}

