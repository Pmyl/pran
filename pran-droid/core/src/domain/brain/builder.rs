use std::sync::Arc;
use crate::application::brain::pran_droid_brain::TextPhonemiser;
use crate::domain::brain::pran_droid_brain::{PranDroidBrain, ReactionNotifier};
use crate::domain::reactions::reaction_definition::{ChatCommandTrigger, ChatKeywordTrigger, ReactionDefinition, ReactionDefinitionId, ReactionTrigger};

pub struct PranDroidBrainBuilder {
    chat_command_triggers: Vec<(ChatCommandTrigger, ReactionDefinitionId)>,
    chat_keyword_triggers: Vec<(ChatKeywordTrigger, ReactionDefinitionId)>,
    reaction_definitions: Vec<ReactionDefinition>,
    text_phonemiser: Arc<dyn TextPhonemiser>,
    reaction_notifier: Arc<dyn ReactionNotifier>,
}

impl PranDroidBrainBuilder {
    pub fn new(text_phonemiser: Arc<dyn TextPhonemiser>, reaction_notifier: Arc<dyn ReactionNotifier>) -> Self {
        PranDroidBrainBuilder {
            text_phonemiser,
            reaction_notifier,
            chat_command_triggers: vec![],
            chat_keyword_triggers: vec![],
            reaction_definitions: vec![],
        }
    }

    pub fn with_reaction(&mut self, reaction: ReactionDefinition) {
        if reaction.is_disabled {
            return;
        }

        for trigger in &reaction.triggers {
            match trigger {
                ReactionTrigger::ChatCommand(command_trigger) => self.chat_command_triggers.push((command_trigger.clone(), reaction.id.clone())),
                ReactionTrigger::ChatKeyword(keyword_trigger) => self.chat_keyword_triggers.push((keyword_trigger.clone(), reaction.id.clone())),
            }
        }
        self.reaction_definitions.push(reaction);
    }

    pub fn build(self) -> PranDroidBrain {
        PranDroidBrain::new(
            self.text_phonemiser,
            self.reaction_notifier,
            self.chat_command_triggers,
            self.chat_keyword_triggers,
            self.reaction_definitions,
        )
    }
}