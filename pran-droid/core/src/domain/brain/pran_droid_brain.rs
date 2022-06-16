use std::sync::Arc;
use crate::application::brain::pran_droid_brain::TextPhonemiser;
use crate::domain::brain::stimuli::{ChatMessageStimulus, Stimulus};
use crate::domain::reactions::reaction::Reaction;
use crate::domain::reactions::reaction_definition::{ReactionDefinition, ReactionTrigger};

pub struct PranDroidBrain {
    chat_reactions: Vec<ReactionDefinition>,
    text_phonemiser: Arc<dyn TextPhonemiser>,
}

impl PranDroidBrain {
    pub fn new(text_phonemiser: Arc<dyn TextPhonemiser>, chat_reactions: Vec<ReactionDefinition>) -> Self {
        PranDroidBrain {
            text_phonemiser,
            chat_reactions
        }
    }

    pub fn stimulate(&self, stimulus: Stimulus) -> Option<Reaction> {
        debug!("Brain stimulated with {:?}", stimulus);
        match stimulus {
            Stimulus::ChatMessage(ChatMessageStimulus { text: chat_message, .. }) => self.handle_chat_message(chat_message),
        }
    }

    fn handle_chat_message(&self, message: String) -> Option<Reaction> {
        self.chat_reactions.iter()
            .find(|definition| {
                match definition.trigger {
                    ReactionTrigger::Chat(ref chat_trigger) => chat_trigger.matches(&message),
                    _ => false
                }
            })
            .map(|definition| {
                debug!("Matching reaction found {:?}", definition);
                Reaction::create(&self.text_phonemiser, definition)
            })
    }
}