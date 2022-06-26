use sea_orm_migration::prelude::*;
use pran_droid_persistence_sea_orm_entities::emotions::emotion::Entity as EmotionEntity;
use pran_droid_persistence_sea_orm_entities::emotions::emotion::Column as EmotionColumn;
use pran_droid_persistence_sea_orm_entities::emotions::emotion_animation_layer::Entity as EmotionAnimationLayerEntity;
use pran_droid_persistence_sea_orm_entities::emotions::emotion_animation_layer::Column as EmotionAnimationLayerColumn;
use pran_droid_persistence_sea_orm_entities::emotions::emotion_mouth_layer::Entity as EmotionMouthLayerEntity;
use pran_droid_persistence_sea_orm_entities::emotions::emotion_mouth_layer::Column as EmotionMouthLayerColumn;
use pran_droid_persistence_sea_orm_entities::images::image::Entity as ImageEntity;
use pran_droid_persistence_sea_orm_entities::images::image::Column as ImageColumn;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "m20220624_190257_create_emotions_tables"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.create_table(
            Table::create()
                .table(EmotionEntity)
                .if_not_exists()
                .col(
                    ColumnDef::new(EmotionColumn::Id)
                        .string()
                        .not_null()
                        .primary_key(),
                )
                .col(ColumnDef::new(EmotionColumn::Name).string().not_null())
                .to_owned(),
        ).await?;

        manager.create_table(
            Table::create()
                .table(EmotionMouthLayerEntity)
                .if_not_exists()
                .col(
                    ColumnDef::new(EmotionMouthLayerColumn::Id)
                        .integer()
                        .not_null()
                        .auto_increment()
                        .primary_key(),
                )
                .col(ColumnDef::new(EmotionMouthLayerColumn::EmotionId).string().not_null())
                .col(ColumnDef::new(EmotionMouthLayerColumn::LayerIndex).integer().not_null())
                .col(ColumnDef::new(EmotionMouthLayerColumn::Mapping).string().not_null())
                .foreign_key(ForeignKeyCreateStatement::new()
                    .name("fk-emotion_mouth_layer-emotion")
                    .from(EmotionMouthLayerEntity, EmotionMouthLayerColumn::EmotionId)
                    .to(EmotionEntity, EmotionColumn::Id)
                    .on_update(ForeignKeyAction::Cascade)
                    .on_delete(ForeignKeyAction::Cascade))
                .to_owned(),
        ).await?;

        manager.create_table(
            Table::create()
                .table(EmotionAnimationLayerEntity)
                .if_not_exists()
                .col(
                    ColumnDef::new(EmotionAnimationLayerColumn::Id)
                        .integer()
                        .not_null()
                        .auto_increment()
                        .primary_key(),
                )
                .col(ColumnDef::new(EmotionAnimationLayerColumn::EmotionId).string().not_null())
                .col(ColumnDef::new(EmotionAnimationLayerColumn::LayerIndex).integer().not_null())
                .col(ColumnDef::new(EmotionAnimationLayerColumn::FrameStart).integer().not_null())
                .col(ColumnDef::new(EmotionAnimationLayerColumn::FrameEnd).integer().not_null())
                .col(ColumnDef::new(EmotionAnimationLayerColumn::ImageId).string().not_null())
                .foreign_key(ForeignKeyCreateStatement::new()
                    .name("fk-emotion_animation_layer-emotion")
                    .from(EmotionAnimationLayerEntity, EmotionAnimationLayerColumn::EmotionId)
                    .to(EmotionEntity, EmotionColumn::Id)
                    .on_update(ForeignKeyAction::Cascade)
                    .on_delete(ForeignKeyAction::Cascade))
                .foreign_key(ForeignKeyCreateStatement::new()
                    .name("fk-emotion_animation_layer-image")
                    .from(EmotionAnimationLayerEntity, EmotionAnimationLayerColumn::ImageId)
                    .to(ImageEntity, ImageColumn::Id)
                    .on_update(ForeignKeyAction::Cascade)
                    .on_delete(ForeignKeyAction::Restrict))
                .to_owned(),
        ).await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(EmotionMouthLayerEntity).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table(EmotionAnimationLayerEntity).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table(EmotionEntity).to_owned())
            .await
    }
}
