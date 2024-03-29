use std::fmt::{Display, Formatter, Result};

#[derive(Debug)]
#[derive(Clone)]
pub enum ChatEvent {
    Message(ChatMessage),
    Action(ChatAction)
}

impl Display for ChatEvent {
    fn fmt(&self, f: &mut Formatter<'_>) -> Result {
        match self {
            ChatEvent::Message(message) => write!(f, "{}: {} - mod: {}", message.name, message.content, message.is_mod.to_string()),
            ChatEvent::Action(action) => write!(f, "{}: {} - {} - mod: {}", action.name, action.action_name, action.action_id, action.is_mod.to_string())
        }
    }
}

#[derive(Debug)]
#[derive(Clone)]
pub struct ChatMessage {
    pub name: String,
    pub content: String,
    pub is_mod: bool
}

#[derive(Clone)]
#[derive(Debug)]
pub struct ChatAction {
    pub name: String,
    pub is_mod: bool,
    pub action_id: String,
    pub action_name: String
}
