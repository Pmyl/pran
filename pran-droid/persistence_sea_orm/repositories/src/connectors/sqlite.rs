use async_trait::async_trait;
use pran_droid_persistence_sea_orm_migration::MigratorTrait;
use sea_orm::{Database, DatabaseConnection};
use crate::connectors::connector::SeaOrmDatabaseConnector;

pub struct SeaOrmSqliteInMemoryConnector {
    connection: DatabaseConnection
}

impl SeaOrmSqliteInMemoryConnector {
    pub async fn new() -> Self {
        let connection = Database::connect("sqlite::memory:?cache=shared").await.unwrap();
        pran_droid_persistence_sea_orm_migration::Migrator::up(&connection, None).await.unwrap();

        SeaOrmSqliteInMemoryConnector { connection }
    }
}

#[async_trait]
impl SeaOrmDatabaseConnector for SeaOrmSqliteInMemoryConnector {
    async fn connect(&self) -> DatabaseConnection {
        self.connection.clone()
    }
}