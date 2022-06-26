pub use sea_orm_migration::prelude::*;

mod m20220101_000001_create_images_table;
mod m20220624_190257_create_emotions_tables;
mod m20220625_002118_create_reactions_tables;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20220101_000001_create_images_table::Migration),
            Box::new(m20220624_190257_create_emotions_tables::Migration),
            Box::new(m20220625_002118_create_reactions_tables::Migration),
        ]
    }
}
