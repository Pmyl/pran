use std::sync::Arc;
use serde::Deserialize;
use rocket::serde::json::Json;
use rocket::{State};
use pran_droid_brain::brain_output::outputs::ReactionOutput;
use pran_droid_brain::simulate::simulate_droid_brain;
use pran_droid_core::domain::brain::stimuli::{ChatMessageStimulus, Source, Stimulus};
use pran_droid_core::domain::reactions::reaction_definition_repository::ReactionDefinitionRepository;
use crate::infrastructure::authenticated::Authenticated;

#[post("/brain/simulation/message", format = "json", data = "<payload>")]
pub async fn api_brain_simulate_message(_authenticated: Authenticated, payload: Json<BrainSimulateMessageApiRequest>, reaction_repository: &State<Arc<dyn ReactionDefinitionRepository>>) -> Json<Option<ReactionOutput>> {
    Json(simulate_droid_brain(reaction_repository.as_ref(), payload.0.into()).await)
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BrainSimulateMessageApiRequest {
    user_name: String,
    is_mod: bool,
    text: String
}

impl Into<Stimulus> for BrainSimulateMessageApiRequest {
    fn into(self) -> Stimulus {
        Stimulus::ChatMessage(ChatMessageStimulus {
            source: Source {
                is_mod: self.is_mod,
                user_name: self.user_name
            },
            text: self.text
        })
    }
}