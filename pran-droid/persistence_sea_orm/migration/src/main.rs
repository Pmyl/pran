use sea_orm_migration::prelude::*;
use pran_droid_persistence_sea_orm_migration::Migrator;

#[async_std::main]
async fn main() {
    cli::run_cli(Migrator).await;
}
