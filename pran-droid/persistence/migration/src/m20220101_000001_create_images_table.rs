use sea_orm_migration::prelude::*;
use pran_droid_persistence_entities::images::image::Entity as ImageEntity;
use pran_droid_persistence_entities::images::image::Column as ImageColumn;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "m20220101_000001_create_images_table"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(ImageEntity)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(ImageColumn::Id)
                            .string()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(ImageColumn::Url).string().not_null())
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(ImageEntity).to_owned())
            .await
    }
}
