use async_trait::async_trait;
use serde::{Serialize, Deserialize};
use uuid::Uuid;
use pran_droid_core::domain::emotions::emotion::EmotionId;
use pran_droid_core::domain::reactions::reaction::Milliseconds;
use pran_droid_core::domain::reactions::reaction_definition::{ChatCommandTrigger, MovingReactionStepDefinition, ReactionDefinition, ReactionDefinitionId, ReactionStepDefinition, ReactionStepSkipDefinition, ReactionStepTextAlternativeDefinition, ReactionStepTextAlternativesDefinition, ReactionStepTextDefinition, ReactionTrigger, TalkingReactionStepDefinition};
use crate::deta::{Base, Deta, Query, InsertError as DetaInsertError, PutError, QueryAll};
use pran_droid_core::domain::reactions::reaction_definition_repository::{ReactionDefinitionRepository, ReactionInsertError, ReactionUpdateError};
use crate::animations::animation::{AnimationStorage, into_animation_domain, into_animation_storage};

pub struct DetaReactionRepository {
    base: Base,
}

impl DetaReactionRepository {
    pub fn new(project_key: String, project_id: String) -> Self {
        Self { base: Deta::new(project_key, project_id).base("pran_droid_reactions") }
    }

    fn triggers_contain(&self, triggers: Vec<ReactionTrigger>, trigger_to_search: &ReactionTrigger) -> bool {
        for trigger in triggers {
            if &trigger == trigger_to_search {
                return true
            }
        }

        false
    }
}

#[derive(Debug, Serialize, Deserialize)]
struct ReactionStorage {
    key: String,
    triggers: Vec<ReactionTriggerStorage>,
    steps: Vec<ReactionStepStorage>,
    is_disabled: bool,
    count: u32,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
enum ReactionTriggerStorage {
    #[serde(rename = "chat_command")]
    ChatCommand { command: String },
    #[serde(rename = "chat_keyword")]
    ChatKeyword { command: String },
}

#[derive(Debug, Serialize, Deserialize)]
enum ReactionStepStorage {
    Moving { animation: AnimationStorage, skip: ReactionSkipStorage },
    Talking { emotion_id: String, skip: ReactionSkipStorage, text: Vec<ReactionStepTextAlternativeStorage> },
}

#[derive(Debug, Serialize, Deserialize)]
struct ReactionStepTextAlternativeStorage {
    probability: f32,
    text: ReactionStepTextStorage
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
enum ReactionStepTextStorage {
    #[serde(rename = "instant")]
    Instant { text: String },
    #[serde(rename = "letter_by_letter")]
    LetterByLetter { text: String }
}

#[derive(Debug, Serialize, Deserialize)]
enum ReactionSkipStorage {
    ImmediatelyAfter,
    AfterMilliseconds(u16),
    AfterStepWithExtraMilliseconds(u16)
}

impl Into<ReactionDefinition> for ReactionStorage {
    fn into(self) -> ReactionDefinition { (&self).into() }
}

impl From<&ReactionStorage> for ReactionDefinition {
    fn from(storage: &ReactionStorage) -> ReactionDefinition {
        ReactionDefinition {
            id: ReactionDefinitionId(storage.key.clone()),
            steps: storage.steps.iter().map(into_step_domain).collect(),
            triggers: storage.triggers.iter().map(into_trigger_domain).collect(),
            is_disabled: storage.is_disabled,
            count: storage.count
        }
    }
}

impl From<&ReactionDefinition> for ReactionStorage {
    fn from(reaction: &ReactionDefinition) -> Self {
        Self {
            key: reaction.id.0.clone(),
            triggers: reaction.triggers.iter().map(into_trigger_storage).collect(),
            steps: reaction.steps.iter().map(into_step_storage).collect(),
            is_disabled: reaction.is_disabled,
            count: reaction.count,
        }
    }
}

fn into_trigger_storage(trigger: &ReactionTrigger) -> ReactionTriggerStorage {
    match trigger {
        ReactionTrigger::ChatCommand(chat_command) => ReactionTriggerStorage::ChatCommand { command: chat_command.text.clone() },
        ReactionTrigger::ChatKeyword(chat_command) => ReactionTriggerStorage::ChatKeyword { command: chat_command.text.clone() },
    }
}

fn into_trigger_domain(trigger: &ReactionTriggerStorage) -> ReactionTrigger {
    match trigger {
        ReactionTriggerStorage::ChatCommand { command } => ReactionTrigger::ChatCommand(ChatCommandTrigger { text: command.clone() }),
        ReactionTriggerStorage::ChatKeyword { command } => ReactionTrigger::new_chat_keyword(command.clone()).unwrap(),
    }
}

fn into_step_domain(step: &ReactionStepStorage) -> ReactionStepDefinition {
    match step {
        ReactionStepStorage::Moving { skip, animation } => ReactionStepDefinition::Moving(MovingReactionStepDefinition {
            skip: into_skip_domain(skip),
            animation: into_animation_domain(animation)
        }),
        ReactionStepStorage::Talking { skip, emotion_id, text } => ReactionStepDefinition::Talking(TalkingReactionStepDefinition {
            skip: into_skip_domain(skip),
            emotion_id: EmotionId(emotion_id.clone()),
            text: into_text_alternatives_domain(text)
        })
    }
}

fn into_step_storage(step: &ReactionStepDefinition) -> ReactionStepStorage {
    match step {
        ReactionStepDefinition::Moving(moving) => ReactionStepStorage::Moving {
            skip: into_skip_storage(&moving.skip),
            animation: into_animation_storage(&moving.animation)
        },
        ReactionStepDefinition::Talking(talking) => ReactionStepStorage::Talking {
            skip: into_skip_storage(&talking.skip),
            emotion_id: talking.emotion_id.0.clone(),
            text: into_text_alternatives_storage(&talking.text)
        },
        ReactionStepDefinition::CompositeTalking(_) => todo!("Implement when CompositeTalking is done")
    }
}

fn into_skip_storage(skip: &ReactionStepSkipDefinition) -> ReactionSkipStorage {
    match skip {
        ReactionStepSkipDefinition::ImmediatelyAfter => ReactionSkipStorage::ImmediatelyAfter,
        ReactionStepSkipDefinition::AfterMilliseconds(ms) => ReactionSkipStorage::AfterMilliseconds(ms.0),
        ReactionStepSkipDefinition::AfterStepWithExtraMilliseconds(ms) => ReactionSkipStorage::AfterStepWithExtraMilliseconds(ms.0)
    }
}

fn into_skip_domain(skip: &ReactionSkipStorage) -> ReactionStepSkipDefinition {
    match skip {
        ReactionSkipStorage::ImmediatelyAfter => ReactionStepSkipDefinition::ImmediatelyAfter,
        ReactionSkipStorage::AfterMilliseconds(ms) => ReactionStepSkipDefinition::AfterMilliseconds(Milliseconds(*ms)),
        ReactionSkipStorage::AfterStepWithExtraMilliseconds(ms) => ReactionStepSkipDefinition::AfterStepWithExtraMilliseconds(Milliseconds(*ms))
    }
}

fn into_text_alternatives_storage(alternatives: &ReactionStepTextAlternativesDefinition) -> Vec<ReactionStepTextAlternativeStorage> {
    alternatives.alternatives
        .iter()
        .map(|alternative| ReactionStepTextAlternativeStorage {
            text: into_text_storage(&alternative.text),
            probability: alternative.probability
        })
        .collect()
}

fn into_text_storage(text: &ReactionStepTextDefinition) -> ReactionStepTextStorage {
    match text {
        ReactionStepTextDefinition::Instant(text) => ReactionStepTextStorage::Instant { text: text.clone() },
        ReactionStepTextDefinition::LetterByLetter(text) => ReactionStepTextStorage::LetterByLetter { text: text.clone() },
    }
}

fn into_text_domain(text: &ReactionStepTextStorage) -> ReactionStepTextDefinition {
    match text {
        ReactionStepTextStorage::Instant { text } => ReactionStepTextDefinition::Instant(text.clone()),
        ReactionStepTextStorage::LetterByLetter { text } => ReactionStepTextDefinition::LetterByLetter(text.clone()),
    }
}

fn into_text_alternatives_domain(alternatives: &Vec<ReactionStepTextAlternativeStorage>) -> ReactionStepTextAlternativesDefinition {
    ReactionStepTextAlternativesDefinition {
        alternatives: alternatives
            .iter()
            .map(|alternative| ReactionStepTextAlternativeDefinition {
                text: into_text_domain(&alternative.text),
                probability: alternative.probability
            })
            .collect()
    }
}

#[async_trait]
impl ReactionDefinitionRepository for DetaReactionRepository {
    fn next_id(&self) -> ReactionDefinitionId {
        ReactionDefinitionId(Uuid::new_v4().to_string())
    }

    async fn insert(&self, reaction: &ReactionDefinition) -> Result<(), ReactionInsertError> {
        self.base.insert::<ReactionStorage>(reaction.into()).await
            .map_err(|error| match error {
                DetaInsertError::Unexpected(_) => ReactionInsertError::Unexpected,
                DetaInsertError::Conflict => ReactionInsertError::Conflict,
                DetaInsertError::BadRequest(_) => ReactionInsertError::Unexpected
            })
            .map(|_| ())
    }

    async fn exists_with_trigger(&self, trigger: &ReactionTrigger) -> bool {
        let triggers = self.base.query::<ReactionStorage>(Query::default()).await
            .expect("Unexpected error")
            .items
            .iter()
            .map(Into::<ReactionDefinition>::into)
            .flat_map(|reaction| reaction.triggers)
            .collect();

        self.triggers_contain(triggers, trigger)
    }

    async fn other_exists_with_trigger(&self, trigger: &ReactionTrigger, excluded_reaction_definition_id: &ReactionDefinitionId) -> bool {
        let triggers = self.base.query::<ReactionStorage>(Query::default()).await
            .expect("Unexpected error")
            .items
            .iter()
            .filter(|reaction| reaction.key != excluded_reaction_definition_id.0)
            .map(Into::<ReactionDefinition>::into)
            .flat_map(|reaction| reaction.triggers)
            .collect();

        self.triggers_contain(triggers, trigger)
    }

    async fn get(&self, id: &ReactionDefinitionId) -> Option<ReactionDefinition> {
        self.base.get::<ReactionStorage>(id.0.as_str()).await.ok().map(Into::into)
    }

    async fn get_all(&self) -> Vec<ReactionDefinition> {
        self.base.query_all::<ReactionStorage>(QueryAll::default()).await
            .expect("Unexpected error")
            .into_iter()
            .map(Into::into)
            .collect()
    }

    async fn update(&self, reaction: &ReactionDefinition) -> Result<(), ReactionUpdateError> {
        self.base.put::<ReactionStorage>(vec![reaction.into()]).await
            .map_err(|error| match error {
                PutError::Unexpected(_) => ReactionUpdateError::Missing,
                PutError::BadRequest(_) => ReactionUpdateError::Missing
            })
            .map(|_| ())
    }
}