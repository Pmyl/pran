use std::sync::Arc;
use async_trait::async_trait;
use itertools::Itertools;
use sea_orm::{Condition, QueryFilter};
use sea_orm::{entity::*};
use sea_orm::DatabaseConnection;
use uuid::Uuid;
use pran_droid_core::domain::animations::animation::{Animation, AnimationFrame, AnimationFrames};
use pran_droid_core::domain::emotions::emotion::EmotionId;
use pran_droid_core::domain::reactions::reaction_definition::{ReactionDefinition, ReactionDefinitionId, ReactionTrigger, ReactionStepDefinition, ReactionStepTextDefinition, TalkingReactionStepDefinition, ChatCommandTrigger, ReactionStepSkipDefinition};
use pran_droid_core::domain::images::image::ImageId;
use pran_droid_core::domain::reactions::reaction::{Milliseconds, MovingReactionStep, ReactionStepSkip};
use pran_droid_core::domain::reactions::reaction_definition_repository::{ReactionDefinitionRepository, ReactionInsertError, ReactionUpdateError};
use pran_droid_persistence_sea_orm_entities::reactions::reaction_definition::Entity as ReactionDefinitionEntity;
use pran_droid_persistence_sea_orm_entities::reactions::reaction_definition::Model as ReactionDefinitionModel;
use pran_droid_persistence_sea_orm_entities::reactions::reaction_definition::ActiveModel as ReactionDefinitionActiveModel;
use pran_droid_persistence_sea_orm_entities::reactions::reaction_definition_step::Entity as ReactionDefinitionStepEntity;
use pran_droid_persistence_sea_orm_entities::reactions::reaction_definition_step::Model as ReactionDefinitionStepModel;
use pran_droid_persistence_sea_orm_entities::reactions::reaction_definition_step::ActiveModel as ReactionDefinitionStepActiveModel;
use pran_droid_persistence_sea_orm_entities::reactions::reaction_definition_trigger::Entity as ReactionDefinitionTriggerEntity;
use pran_droid_persistence_sea_orm_entities::reactions::reaction_definition_trigger::Model as ReactionDefinitionTriggerModel;
use pran_droid_persistence_sea_orm_entities::reactions::reaction_definition_trigger::ActiveModel as ReactionDefinitionTriggerActiveModel;
use pran_droid_persistence_sea_orm_entities::reactions::reaction_definition_trigger::Column as ReactionDefinitionTriggerColumn;
use pran_droid_persistence_sea_orm_entities::reactions::reaction_definition_moving_step_frame::Entity as ReactionDefinitionMovingStepFrameEntity;
use pran_droid_persistence_sea_orm_entities::reactions::reaction_definition_moving_step_frame::ActiveModel as ReactionDefinitionMovingStepFrameActiveModel;
use pran_droid_persistence_sea_orm_entities::reactions::reaction_definition_moving_step_frame::Model as ReactionDefinitionMovingStepFrameModel;
use crate::connectors::connector::SeaOrmDatabaseConnector;

fn into_reaction_table(reaction: &ReactionDefinition) -> ReactionDefinitionActiveModel {
    ReactionDefinitionActiveModel { id: Set(reaction.id.0.clone()) }
}

fn into_reaction_domain(model: ReactionDefinitionModel, trigger_models: Vec<ReactionDefinitionTriggerModel>, step_models: Vec<ReactionDefinitionStepModel>, frames: Vec<ReactionDefinitionMovingStepFrameModel>) -> ReactionDefinition {
    let mut steps: Vec<ReactionStepDefinition> = vec![];
    for step in &step_models {
        steps.insert(usize::try_from(step.step_index).unwrap(), match step.step_type.as_str() {
            "Moving" => ReactionStepDefinition::Moving(MovingReactionStep {
                skip: into_domain_skip(&step.skip),
                animation: into_domain_animation(&step.id, &frames)
            }),
            "Talking" => ReactionStepDefinition::Talking(TalkingReactionStepDefinition {
                skip: into_domain_skip(&step.skip),
                text: into_domain_text(&step.text.as_ref().unwrap()),
                emotion_id: EmotionId(step.emotion_id.as_ref().unwrap().clone())
            }),
            "CompositeTalking" => todo!("Implement when CompositeTalking is a thing"),
            _ => unreachable!()
        });
    }

    let mut triggers: Vec<ReactionTrigger> = vec![];
    for trigger in &trigger_models {
        let split_index = trigger.definition.find(":").unwrap();
        let trigger_type: String = trigger.definition[..split_index].to_string();
        let trigger_text: String = trigger.definition[split_index + 1..].to_string();
        triggers.push(match trigger_type.as_str() {
            "chat_command" => ReactionTrigger::ChatCommand(ChatCommandTrigger { text: trigger_text.clone() }),
            _ => unreachable!()
        });
    }

    ReactionDefinition {
        id: ReactionDefinitionId(model.id),
        steps,
        triggers
    }
}

fn into_domain_skip(skip: &String) -> ReactionStepSkipDefinition {
    let split_index = skip.find(":").unwrap();
    let skip_type: String = skip[..split_index].to_string();
    let skip_data: String = skip[split_index + 1..].to_string();

    match skip_type.as_str() {
        "immediate" => ReactionStepSkip::ImmediatelyAfter,
        "afterms" => ReactionStepSkip::AfterMilliseconds(Milliseconds(skip_data.parse::<u16>().unwrap())),
        "afterstep" => ReactionStepSkip::AfterStepWithExtraMilliseconds(Milliseconds(skip_data.parse::<u16>().unwrap())),
        _ => unreachable!("Stored text doesn't match either immediate or afterms or afterstep: {}", skip)
    }
}

fn into_domain_text(text_column: &String) -> ReactionStepTextDefinition {
    let split_index = text_column.find(":").unwrap();
    let text_type: String = text_column[..split_index].to_string();
    let text: String = text_column[split_index + 1..].to_string();

    match text_type.as_str() {
        "instant" => ReactionStepTextDefinition::Instant(text.clone()),
        "letterbyletter" => ReactionStepTextDefinition::LetterByLetter(text.clone()),
        _ => unreachable!("Stored text doesn't match either instant or letterbyletter: {}", text_column)
    }
}

fn into_domain_animation(step_id: &String, frames: &Vec<ReactionDefinitionMovingStepFrameModel>) -> Animation {
    Animation {
        frames: AnimationFrames(frames.iter().filter(|frame| &frame.step_id == step_id).map(|frame| AnimationFrame {
            image_id: ImageId(frame.image_id.clone()),
            frame_start: frame.frame_start,
            frame_end: frame.frame_end,
        }).sorted_by_key(|frame| frame.frame_start).collect())
    }
}

fn into_reaction_triggers_table(reaction: &ReactionDefinition) -> Vec<ReactionDefinitionTriggerActiveModel> {
    reaction.triggers.iter().map(|trigger| ReactionDefinitionTriggerActiveModel {
        id: NotSet,
        reaction_id: Set(reaction.id.0.clone()),
        definition: Set(into_trigger_definition_column(trigger))
    }).collect()
}

fn into_trigger_definition_column(trigger: &ReactionTrigger) -> String {
    match trigger {
        ReactionTrigger::ChatCommand(command) => format!("chat_command:{}", command.text)
    }
}

fn into_reaction_steps_table(reaction: &ReactionDefinition) -> (Vec<ReactionDefinitionStepActiveModel>, Vec<ReactionDefinitionMovingStepFrameActiveModel>) {
    let mut steps: Vec<ReactionDefinitionStepActiveModel> = vec![];
    let mut animation_frames: Vec<ReactionDefinitionMovingStepFrameActiveModel> = vec![];

    for (pos, step) in reaction.steps.iter().enumerate() {
        match step {
            ReactionStepDefinition::Moving(moving_step) => {
                let moving_step_id = Uuid::new_v4().to_string();
                steps.push(ReactionDefinitionStepActiveModel {
                    id: Set(moving_step_id.clone()),
                    step_type: Set("Moving".to_string()),
                    step_index: Set(u32::try_from(pos).unwrap()),
                    skip: Set(into_skip_column(&moving_step.skip)),
                    emotion_id: Set(None),
                    reaction_id: Set(reaction.id.0.clone()),
                    text: Set(None)
                });

                for frame in &moving_step.animation.frames.0 {
                    animation_frames.push(ReactionDefinitionMovingStepFrameActiveModel {
                        id: NotSet,
                        reaction_id: Set(reaction.id.0.clone()),
                        step_id: Set(moving_step_id.clone()),
                        frame_start: Set(frame.frame_start),
                        frame_end: Set(frame.frame_end),
                        image_id: Set(frame.image_id.0.clone()),
                    });
                }
            },
            ReactionStepDefinition::Talking(talking_step) => steps.push(ReactionDefinitionStepActiveModel {
                id: Set(Uuid::new_v4().to_string()),
                step_type: Set("Talking".to_string()),
                step_index: Set(u32::try_from(pos).unwrap()),
                skip: Set(into_skip_column(&talking_step.skip)),
                emotion_id: Set(Some(talking_step.emotion_id.0.clone())),
                text: Set(Some(match &talking_step.text {
                    ReactionStepTextDefinition::Instant(text) => format!("instant:{}", text),
                    ReactionStepTextDefinition::LetterByLetter(text) => format!("letterbyletter:{}", text)
                })),
                reaction_id: Set(reaction.id.0.clone())
            }),
            ReactionStepDefinition::CompositeTalking(_) => todo!("Implement this when CompositeTalking is a thing")
        }
    }

    (steps, animation_frames)
}

fn into_skip_column(skip: &ReactionStepSkip) -> String {
    match skip {
        ReactionStepSkip::ImmediatelyAfter => "immediate:".to_string(),
        ReactionStepSkip::AfterMilliseconds(ms) => format!("afterms:{}", ms.0),
        ReactionStepSkip::AfterStepWithExtraMilliseconds(ms) => format!("afterstep:{}", ms.0)
    }
}


pub struct SeaOrmReactionDefinitionRepository {
    pub connector: Arc<dyn SeaOrmDatabaseConnector>,
}

#[async_trait]
impl ReactionDefinitionRepository for SeaOrmReactionDefinitionRepository {
    fn next_id(&self) -> ReactionDefinitionId {
        ReactionDefinitionId(Uuid::new_v4().to_string())
    }

    async fn insert(&self, reaction: &ReactionDefinition) -> Result<(), ReactionInsertError> {
        let connection: DatabaseConnection = self.connector.connect().await;

        ReactionDefinitionEntity::insert(into_reaction_table(reaction)).exec(&connection).await
            .map_err(|error| if error.to_string().to_lowercase().contains("unique") { ReactionInsertError::Conflict } else { ReactionInsertError::Unexpected })?;

        let (steps, frames) = into_reaction_steps_table(reaction);
        if steps.len() > 0 {
            ReactionDefinitionStepEntity::insert_many(steps).exec(&connection).await
                .map_err(|_| ReactionInsertError::Unexpected)?;
        }
        if frames.len() > 0 {
            ReactionDefinitionMovingStepFrameEntity::insert_many(frames).exec(&connection).await
                .map_err(|_| ReactionInsertError::Unexpected)?;
        }

        let triggers = into_reaction_triggers_table(reaction);
        if triggers.len() > 0 {
            ReactionDefinitionTriggerEntity::insert_many(triggers).exec(&connection).await
                .map_err(|_| ReactionInsertError::Unexpected)?;
        }

        Ok(())
    }

    async fn exists_with_trigger(&self, trigger: &ReactionTrigger) -> bool {
        let connection: DatabaseConnection = self.connector.connect().await;

        ReactionDefinitionTriggerEntity::find()
            .filter(ReactionDefinitionTriggerColumn::Definition.eq(into_trigger_definition_column(trigger)))
            .one(&connection)
            .await.unwrap()
            .is_some()
    }

    async fn other_exists_with_trigger(&self, trigger: &ReactionTrigger, excluded_reaction_definition_id: &ReactionDefinitionId) -> bool {
        let connection: DatabaseConnection = self.connector.connect().await;

        ReactionDefinitionTriggerEntity::find()
            .filter(
                Condition::all()
                    .add(ReactionDefinitionTriggerColumn::Definition.eq(into_trigger_definition_column(trigger)))
                    .add(ReactionDefinitionTriggerColumn::ReactionId.ne(excluded_reaction_definition_id.0.clone()))
            )
            .one(&connection)
            .await.unwrap()
            .is_some()
    }

    async fn get(&self, id: &ReactionDefinitionId) -> Option<ReactionDefinition> {
        let connection = self.connector.connect().await;

        let reaction: ReactionDefinitionModel = ReactionDefinitionEntity::find_by_id(id.0.clone())
            .one(&connection)
            .await.unwrap()?;

        let (triggers, steps, frames) = Self::get_related_entities(&reaction, &connection).await;

        Some(into_reaction_domain(reaction, triggers, steps, frames))
    }

    async fn get_all(&self) -> Vec<ReactionDefinition> {
        let connection = self.connector.connect().await;

        let reaction_models: Vec<ReactionDefinitionModel> = ReactionDefinitionEntity::find()
            .all(&connection)
            .await.unwrap();

        let mut reactions: Vec<ReactionDefinition> = vec![];

        for reaction in reaction_models {
            let (triggers, steps, frames) = Self::get_related_entities(&reaction, &connection).await;

            reactions.push(into_reaction_domain(reaction, triggers, steps, frames))
        }

        reactions
    }

    async fn update(&self, reaction: &ReactionDefinition) -> Result<(), ReactionUpdateError> {
        if !self.exists(&reaction.id).await {
            return Err(ReactionUpdateError::Missing);
        }

        let connection = self.connector.connect().await;

        ReactionDefinitionEntity::delete_by_id(reaction.id.0.clone()).exec(&connection).await.unwrap();
        self.insert(reaction).await.unwrap();

        Ok(())
    }
}

impl SeaOrmReactionDefinitionRepository {
    async fn exists(&self, reaction_id: &ReactionDefinitionId) -> bool {
        let connection: DatabaseConnection = self.connector.connect().await;

        ReactionDefinitionEntity::find_by_id(reaction_id.0.clone())
            .one(&connection)
            .await.unwrap()
            .is_some()
    }

    async fn get_related_entities(reaction: &ReactionDefinitionModel, connection: &DatabaseConnection)
        -> (Vec<ReactionDefinitionTriggerModel>, Vec<ReactionDefinitionStepModel>, Vec<ReactionDefinitionMovingStepFrameModel>) {
        (reaction
            .find_related(ReactionDefinitionTriggerEntity)
            .all(connection)
            .await.unwrap(),
        reaction
            .find_related(ReactionDefinitionStepEntity)
            .all(connection)
            .await.unwrap(),
        reaction
            .find_related(ReactionDefinitionMovingStepFrameEntity)
            .all(connection)
            .await.unwrap()
        )
    }
}