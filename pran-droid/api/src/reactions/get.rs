use std::sync::Arc;
use rocket::serde::json::Json;
use rocket::State;
use pran_droid_core::application::reactions::get::{get_reaction, GetReactionRequest};
use pran_droid_core::domain::reactions::reaction_definition_repository::{ReactionDefinitionRepository};
use crate::reactions::models::reaction_model::ReactionResponse;

#[get("/reactions/<reaction_id>")]
pub fn api_get_reaction(reaction_id: String, repo: &State<Arc<dyn ReactionDefinitionRepository>>) -> Option<Json<ReactionResponse>> {
    get_reaction(GetReactionRequest { id: reaction_id }, repo)
        .map(|reaction| Json(reaction.into()))
}
