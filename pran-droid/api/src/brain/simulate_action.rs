use std::sync::Arc;
use serde::Deserialize;
use rocket::serde::json::Json;
use rocket::{State};
use pran_droid_brain::brain_output::outputs::ReactionOutput;
use pran_droid_brain::simulate::simulate_droid_brain;
use pran_droid_core::domain::brain::stimuli::{Action, ActionStimulus, Source, Stimulus};
use pran_droid_core::domain::reactions::reaction_definition_repository::ReactionDefinitionRepository;
use crate::infrastructure::authenticated::Authenticated;

#[post("/brain/simulation/action", format = "json", data = "<payload>")]
pub async fn api_brain_simulate_action(_authenticated: Authenticated, payload: Json<BrainSimulateActionApiRequest>, reaction_repository: &State<Arc<dyn ReactionDefinitionRepository>>) -> Json<Option<ReactionOutput>> {
    Json(simulate_droid_brain(reaction_repository.as_ref(), payload.0.into()).await)
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BrainSimulateActionApiRequest {
    user_name: String,
    is_mod: bool,
    id: String,
    name: String
}

impl Into<Stimulus> for BrainSimulateActionApiRequest {
    fn into(self) -> Stimulus {
        Stimulus::Action(ActionStimulus {
            source: Source {
                is_mod: self.is_mod,
                user_name: self.user_name
            },
            action: Action {
                id: self.id,
                name: self.name
            }
        })
    }
}