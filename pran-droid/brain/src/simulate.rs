use std::sync::Arc;
use pran_droid_core::application::brain::pran_droid_brain::{create_droid_brain, TextPhonemiser};
use pran_droid_core::domain::brain::pran_droid_brain::ReactionNotifier;
use pran_droid_core::domain::brain::stimuli::Stimulus;
use pran_droid_core::domain::reactions::reaction_definition::ReactionDefinitionId;
use pran_droid_core::domain::reactions::reaction_definition_repository::ReactionDefinitionRepository;
use crate::phonemiser::pran_text_phonemiser::PranTextPhonemiser;
use crate::brain_output::outputs::ReactionOutput;

struct NoopReactionNotifier {}
impl ReactionNotifier for NoopReactionNotifier {
    fn notify_reaction_usage(&self, _: &ReactionDefinitionId, _: u32) {}
}

pub async fn simulate_droid_brain(reaction_repository: &dyn ReactionDefinitionRepository, stimulus: Stimulus) -> Option<ReactionOutput> {
    pran_phonemes_core::phonemes::pran_phonemes().expect("PranPhonemes failed to initialise");

    let text_phonemiser: Arc<dyn TextPhonemiser> = Arc::new(PranTextPhonemiser {});
    let reaction_notifier: Arc<dyn ReactionNotifier> = Arc::new(NoopReactionNotifier {});
    let mut brain = create_droid_brain(reaction_repository, &text_phonemiser, &reaction_notifier).await;

    brain.stimulate(stimulus)
        .map(|reaction| Into::<ReactionOutput>::into(reaction))
}
