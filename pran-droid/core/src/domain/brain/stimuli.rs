#[derive(Debug)]
pub enum Stimulus {
    ChatMessage(ChatMessageStimulus),
    Action(ActionStimulus)
}

#[derive(Debug)]
pub struct ChatMessageStimulus {
    pub source: Source,
    pub text: String,
}

#[derive(Debug)]
pub struct ActionStimulus {
    pub source: Source,
    pub action: Action
}

#[derive(Debug)]
pub struct Action {
    pub id: String,
    pub name: String
}

#[derive(Debug)]
pub struct Source {
    pub user_name: String,
    pub is_mod: bool,
}

impl Stimulus {
    pub(crate) fn get_source_name(&self) -> String {
        match self {
            Stimulus::ChatMessage(ChatMessageStimulus { source: Source { user_name, .. }, .. }) => user_name.clone(),
            Stimulus::Action(ActionStimulus { source: Source { user_name, .. }, .. }) => user_name.clone()
        }
    }
}

impl ChatMessageStimulus {
    pub(crate) fn get_target(&self) -> Option<String> {
        self.text.split_whitespace().nth(1).map(|s| s.to_string())
    }
}