use crate::domain::brain::pran_droid_brain::PranDroidBrain;
use crate::domain::reactions::reaction_definition::ReactionDefinition;

pub struct PranDroidBrainBuilder {
    chat_reactions: Vec<ReactionDefinition>
}

impl PranDroidBrainBuilder {
    pub fn new() -> Self { PranDroidBrainBuilder {
        chat_reactions: vec![]
    } }

    pub fn with_reaction_to_chat(&mut self, chat_reaction: ReactionDefinition) {
        self.chat_reactions.push(chat_reaction);
    }

    pub fn build(self) -> PranDroidBrain {
        PranDroidBrain::new(self.chat_reactions)
    }
}