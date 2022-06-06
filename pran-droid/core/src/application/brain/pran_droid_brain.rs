use std::sync::Arc;
use crate::domain::brain::builder::PranDroidBrainBuilder;
use crate::domain::brain::pran_droid_brain::PranDroidBrain;
use crate::domain::reactions::reaction_definition::ReactionTrigger;
use crate::domain::reactions::reaction_repository::ReactionRepository;

pub async fn create_droid_brain(reaction_repository: &Arc<dyn ReactionRepository>) -> PranDroidBrain {
    let reactions = reaction_repository.get_all();
    let mut brain_builder = PranDroidBrainBuilder::new();

    for reaction in reactions {
        match reaction.trigger {
            ReactionTrigger::Chat(_) => {
                brain_builder.with_reaction_to_chat(reaction)
            }
        }
    }

    brain_builder.build()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn create_droid_brain_creates_with_reactions_in_repository() {

    }
}