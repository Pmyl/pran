use std::collections::HashMap;
use std::sync::Arc;
use crate::application::brain::pran_droid_brain::TextPhonemiser;
use crate::domain::brain::stimuli::{ChatMessageStimulus, Stimulus};
use crate::domain::reactions::reaction::{Reaction, ReactionContext};
use crate::domain::reactions::reaction_definition::{ChatCommandTrigger, ChatKeywordTrigger, ReactionDefinition, ReactionDefinitionId};

pub trait ReactionNotifier: Send + Sync {
    fn notify_reaction_usage(&self, reaction_definition_id: &ReactionDefinitionId, new_count: u32);
}

pub struct PranDroidBrain {
    chat_command_triggers: Vec<(ChatCommandTrigger, ReactionDefinitionId)>,
    chat_keyword_triggers: Vec<(ChatKeywordTrigger, ReactionDefinitionId)>,
    reaction_definitions: HashMap<ReactionDefinitionId, ReactionDefinition>,
    reaction_counters: HashMap<ReactionDefinitionId, u32>,
    text_phonemiser: Arc<dyn TextPhonemiser>,
    reaction_notifier: Arc<dyn ReactionNotifier>,
}

impl PranDroidBrain {
    pub fn new(
        text_phonemiser: Arc<dyn TextPhonemiser>,
        reaction_notifier: Arc<dyn ReactionNotifier>,
        chat_command_triggers: Vec<(ChatCommandTrigger, ReactionDefinitionId)>,
        chat_keyword_triggers: Vec<(ChatKeywordTrigger, ReactionDefinitionId)>,
        reaction_definitions: Vec<ReactionDefinition>,
    ) -> Self {
        let mut chat_keyword_triggers = chat_keyword_triggers.clone();
        chat_keyword_triggers.sort_by_key(|(keyword_trigger, _)| keyword_trigger.text.len());
        PranDroidBrain {
            text_phonemiser,
            reaction_notifier,
            chat_command_triggers,
            chat_keyword_triggers,
            reaction_counters: HashMap::new(),
            reaction_definitions: reaction_definitions.into_iter().map(|definition| (definition.id.clone(), definition)).collect()
        }
    }

    pub fn stimulate(&mut self, stimulus: Stimulus) -> Option<Reaction> {
        debug!("Brain stimulated with {:?}", stimulus);
        match &stimulus {
            Stimulus::ChatMessage(ChatMessageStimulus{ ref text, .. }) => {
                let text = { text.clone() };
                self.try_react_to_chat_message(stimulus, &text)
            },
        }
    }

    fn try_react_to_chat_message(&mut self, stimulus: Stimulus, text: &String) -> Option<Reaction> {
        let definition_id = self.chat_command_triggers
            .iter()
            .find(|(trigger, _)| trigger.matches(text))
            .map(|(_, definition_id)| definition_id)
            .or_else(|| self.chat_keyword_triggers
                .iter()
                .find(|(trigger, _)| trigger.matches(text))
                .map(|(_, definition_id)| definition_id));

        self.try_react(stimulus, definition_id.cloned())
    }

    fn try_react(&mut self, stimulus: Stimulus, definition_id: Option<ReactionDefinitionId>) -> Option<Reaction> {
        if let Some(definition_id) = definition_id {
            let reaction_definition = self.reaction_definitions.get(&definition_id).unwrap();
            debug!("Matching reaction found {:?}", definition_id);

            *self.reaction_counters.entry(definition_id.clone()).or_insert(reaction_definition.count) += 1;
            let new_count = *self.reaction_counters.get(&definition_id).unwrap();
            self.reaction_notifier.notify_reaction_usage(&definition_id, new_count);

            Reaction::try_create(self.text_phonemiser.as_ref(), reaction_definition, &ReactionContext {
                count: new_count,
                stimulus
            })
        } else {
            None
        }
    }
}