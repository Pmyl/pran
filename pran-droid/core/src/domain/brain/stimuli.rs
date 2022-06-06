#[derive(Debug)]
pub enum Stimulus {
    ChatMessage(ChatMessageStimulus)
}

#[derive(Debug)]
pub struct ChatMessageStimulus {
    pub source: Source,
    pub text: String,
}

#[derive(Debug)]
pub struct Source {
    pub user_name: String,
    pub is_mod: bool,
}