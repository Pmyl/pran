use std::sync::Arc;
use serde::Serialize;
use rocket::serde::json::Json;
use rocket::State;
use pran_droid_core::application::reactions::dtos::reaction_dto::ReactionDto;
use pran_droid_core::application::reactions::get_all::get_all_reactions;
use pran_droid_core::domain::reactions::reaction_definition_repository::{ReactionDefinitionRepository};
use crate::infrastructure::authenticated::AuthenticatedReadOnly;
use crate::reactions::models::reaction_model::ReactionResponse;

#[derive(Serialize)]
pub struct GetAllReactionsResponse {
    data: Vec<ReactionResponse>
}

impl From<Vec<ReactionDto>> for GetAllReactionsResponse {
    fn from(value: Vec<ReactionDto>) -> Self {
        Self { data: value.into_iter().map(From::from).collect() }
    }
}

#[get("/reactions")]
pub async fn api_get_all_reactions(_authenticated: AuthenticatedReadOnly, repo: &State<Arc<dyn ReactionDefinitionRepository>>) -> Json<GetAllReactionsResponse> {
    Json(get_all_reactions(repo).await.into())
}
