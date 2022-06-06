use std::sync::Arc;
use crate::application::brain::pran_droid_brain::TextPhonemiser;
use crate::domain::brain::pran_droid_brain::PranDroidBrain;
use crate::domain::reactions::reaction_definition::ReactionDefinition;

pub struct PranDroidBrainBuilder {
    chat_reactions: Vec<ReactionDefinition>,
    text_phonemiser: Arc<dyn TextPhonemiser>,
}

impl PranDroidBrainBuilder {
    pub fn new(text_phonemiser: Arc<dyn TextPhonemiser>) -> Self {
        PranDroidBrainBuilder {
            text_phonemiser,
            chat_reactions: vec![]
        }
    }

    pub fn with_reaction_to_chat(&mut self, chat_reaction: ReactionDefinition) {
        self.chat_reactions.push(chat_reaction);
    }

    pub fn build(self) -> PranDroidBrain {
        PranDroidBrain::new(self.text_phonemiser, self.chat_reactions)
    }
}