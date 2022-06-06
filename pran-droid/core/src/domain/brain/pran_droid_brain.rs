use crate::domain::brain::stimuli::Stimulus;
use crate::domain::reactions::reaction::Reaction;
use crate::domain::reactions::reaction_definition::{ReactionDefinition, ReactionTrigger};

pub struct PranDroidBrain {
    chat_reactions: Vec<ReactionDefinition>
}

impl PranDroidBrain {
    pub fn new(chat_reactions: Vec<ReactionDefinition>) -> Self { PranDroidBrain {
        chat_reactions
    } }

    pub fn stimulate(&self, stimulus: Stimulus) -> Option<Reaction> {
        match stimulus {
            Stimulus::ChatMessage { text: chat_message, .. } => self.handle_chat_message(chat_message),
        }
    }

    fn handle_chat_message(&self, message: String) -> Option<Reaction> {
        self.chat_reactions.iter()
            .find(|definition| {
                if let ReactionTrigger::Chat(ref chat_trigger) = definition.trigger {
                    chat_trigger.matches(&message)
                } else {
                    false
                }
            })
            .map(|definition| Reaction::create(definition))
            .map(From::from)
    }
}