use std::sync::Arc;
use rocket::serde::json::Json;
use rocket::State;
use crate::api::reactions::models::reaction_model::ReactionResponse;
use crate::application::reactions::get::{get_reaction, GetReactionRequest};
use crate::domain::reactions::reaction_repository::{ReactionRepository};

#[get("/reactions/<reaction_id>")]
pub fn api_get_reaction(reaction_id: String, repo: &State<Arc<dyn ReactionRepository>>) -> Option<Json<ReactionResponse>> {
    get_reaction(GetReactionRequest { id: reaction_id }, repo)
        .map(|reaction| Json(reaction.into()))
}
