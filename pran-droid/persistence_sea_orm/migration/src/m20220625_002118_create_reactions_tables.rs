use sea_orm_migration::prelude::*;
use pran_droid_persistence_sea_orm_entities::reactions::reaction_definition::Entity as ReactionDefinitionEntity;
use pran_droid_persistence_sea_orm_entities::reactions::reaction_definition::Column as ReactionDefinitionColumn;
use pran_droid_persistence_sea_orm_entities::reactions::reaction_definition_step::Entity as ReactionDefinitionStepEntity;
use pran_droid_persistence_sea_orm_entities::reactions::reaction_definition_step::Column as ReactionDefinitionStepColumn;
use pran_droid_persistence_sea_orm_entities::reactions::reaction_definition_trigger::Entity as ReactionDefinitionTriggerEntity;
use pran_droid_persistence_sea_orm_entities::reactions::reaction_definition_trigger::Column as ReactionDefinitionTriggerColumn;
use pran_droid_persistence_sea_orm_entities::reactions::reaction_definition_moving_step_frame::Entity as ReactionDefinitionMovingStepFrameEntity;
use pran_droid_persistence_sea_orm_entities::reactions::reaction_definition_moving_step_frame::Column as ReactionDefinitionMovingStepFrameColumn;
use pran_droid_persistence_sea_orm_entities::emotions::emotion::Entity as EmotionEntity;
use pran_droid_persistence_sea_orm_entities::emotions::emotion::Column as EmotionColumn;
use pran_droid_persistence_sea_orm_entities::images::image::Entity as ImageEntity;
use pran_droid_persistence_sea_orm_entities::images::image::Column as ImageColumn;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "m20220625_002118_create_reactions_tables"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.create_table(
            Table::create()
                .table(ReactionDefinitionEntity)
                .if_not_exists()
                .col(
                    ColumnDef::new(ReactionDefinitionColumn::Id)
                        .string()
                        .not_null()
                        .primary_key(),
                )
                .to_owned(),
        ).await?;

        manager.create_table(
            Table::create()
                .table(ReactionDefinitionTriggerEntity)
                .if_not_exists()
                .col(
                    ColumnDef::new(ReactionDefinitionTriggerColumn::Id)
                        .integer()
                        .not_null()
                        .auto_increment()
                        .primary_key(),
                )
                .col(ColumnDef::new(ReactionDefinitionTriggerColumn::ReactionId).string().not_null())
                .col(ColumnDef::new(ReactionDefinitionTriggerColumn::Definition).string().not_null())
                .foreign_key(ForeignKeyCreateStatement::new()
                    .name("fk-reaction_definition_trigger-reaction_definition")
                    .from(ReactionDefinitionTriggerEntity, ReactionDefinitionTriggerColumn::ReactionId)
                    .to(ReactionDefinitionEntity, ReactionDefinitionColumn::Id)
                    .on_update(ForeignKeyAction::Cascade)
                    .on_delete(ForeignKeyAction::Cascade))
                .to_owned(),
        ).await?;

        manager.create_table(
            Table::create()
                .table(ReactionDefinitionStepEntity)
                .if_not_exists()
                .col(
                    ColumnDef::new(ReactionDefinitionStepColumn::Id)
                        .string()
                        .not_null()
                        .primary_key(),
                )
                .col(ColumnDef::new(ReactionDefinitionStepColumn::ReactionId).string().not_null())
                .col(ColumnDef::new(ReactionDefinitionStepColumn::StepIndex).integer().not_null())
                .col(ColumnDef::new(ReactionDefinitionStepColumn::StepType).string().not_null())
                .col(ColumnDef::new(ReactionDefinitionStepColumn::Skip).string().not_null())
                .col(ColumnDef::new(ReactionDefinitionStepColumn::EmotionId).string())
                .col(ColumnDef::new(ReactionDefinitionStepColumn::Text).string())
                .foreign_key(ForeignKeyCreateStatement::new()
                    .name("fk-reaction_definition_step-reaction_definition")
                    .from(ReactionDefinitionStepEntity, ReactionDefinitionStepColumn::ReactionId)
                    .to(ReactionDefinitionEntity, ReactionDefinitionColumn::Id)
                    .on_update(ForeignKeyAction::Cascade)
                    .on_delete(ForeignKeyAction::Cascade))
                .foreign_key(ForeignKeyCreateStatement::new()
                    .name("fk-reaction_definition_step-emotion")
                    .from(ReactionDefinitionStepEntity, ReactionDefinitionStepColumn::EmotionId)
                    .to(EmotionEntity, EmotionColumn::Id)
                    .on_update(ForeignKeyAction::Cascade)
                    .on_delete(ForeignKeyAction::Restrict))
                .to_owned(),
        ).await?;

        manager.create_table(
            Table::create()
                .table(ReactionDefinitionMovingStepFrameEntity)
                .if_not_exists()
                .col(
                    ColumnDef::new(ReactionDefinitionMovingStepFrameColumn::Id)
                        .integer()
                        .not_null()
                        .auto_increment()
                        .primary_key(),
                )
                .col(ColumnDef::new(ReactionDefinitionMovingStepFrameColumn::StepId).string().not_null())
                .col(ColumnDef::new(ReactionDefinitionMovingStepFrameColumn::ReactionId).string().not_null())
                .col(ColumnDef::new(ReactionDefinitionMovingStepFrameColumn::FrameStart).integer().not_null())
                .col(ColumnDef::new(ReactionDefinitionMovingStepFrameColumn::FrameEnd).integer().not_null())
                .col(ColumnDef::new(ReactionDefinitionMovingStepFrameColumn::ImageId).string().not_null())
                .foreign_key(ForeignKeyCreateStatement::new()
                    .name("fk-reaction_definition_moving_step_frame-reaction_definition")
                    .from(ReactionDefinitionMovingStepFrameEntity, ReactionDefinitionMovingStepFrameColumn::ReactionId)
                    .to(ReactionDefinitionEntity, ReactionDefinitionColumn::Id)
                    .on_update(ForeignKeyAction::Cascade)
                    .on_delete(ForeignKeyAction::Cascade))
                .foreign_key(ForeignKeyCreateStatement::new()
                    .name("fk-reaction_definition_moving_step_frame-reaction_definition_step")
                    .from(ReactionDefinitionMovingStepFrameEntity, ReactionDefinitionMovingStepFrameColumn::StepId)
                    .to(ReactionDefinitionStepEntity, ReactionDefinitionStepColumn::Id)
                    .on_update(ForeignKeyAction::Cascade)
                    .on_delete(ForeignKeyAction::Cascade))
                .foreign_key(ForeignKeyCreateStatement::new()
                    .name("fk-reaction_definition_moving_step_frame-image")
                    .from(ReactionDefinitionMovingStepFrameEntity, ReactionDefinitionMovingStepFrameColumn::ImageId)
                    .to(ImageEntity, ImageColumn::Id)
                    .on_update(ForeignKeyAction::Cascade)
                    .on_delete(ForeignKeyAction::Restrict))
                .to_owned(),
        ).await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(ReactionDefinitionMovingStepFrameEntity).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table(ReactionDefinitionStepEntity).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table(ReactionDefinitionTriggerEntity).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table(ReactionDefinitionEntity).to_owned())
            .await
    }
}
