use async_trait::async_trait;
use sea_orm::{DatabaseConnection};

#[async_trait]
pub trait SeaOrmDatabaseConnector: Send + Sync {
    async fn connect(&self) -> DatabaseConnection;
}