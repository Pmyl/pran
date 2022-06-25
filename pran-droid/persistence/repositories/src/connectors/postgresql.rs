use async_trait::async_trait;
use sea_orm::{Database, DatabaseConnection};
use crate::connectors::connector::SeaOrmDatabaseConnector;

pub struct SeaOrmPostgreSqlConnector {
    database_url: String
}

impl SeaOrmPostgreSqlConnector {
    pub async fn new(database_url: String) -> Self { SeaOrmPostgreSqlConnector { database_url }}
}

#[async_trait]
impl SeaOrmDatabaseConnector for SeaOrmPostgreSqlConnector {
    async fn connect(&self) -> DatabaseConnection {
        Database::connect(format!("postgres:{}", self.database_url)).await.unwrap()
    }
}