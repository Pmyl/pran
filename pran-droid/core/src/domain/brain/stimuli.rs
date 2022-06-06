#[derive(Debug)]
pub enum Stimulus {
    ChatMessage { source: Source, text: String }
}

#[derive(Debug)]
pub struct Source {
    pub user_name: String,
    pub is_mod: bool
}