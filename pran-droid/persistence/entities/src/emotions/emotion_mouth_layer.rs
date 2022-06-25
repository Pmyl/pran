use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "emotion_mouth_layers")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: u32,
    pub emotion_id: String,
    pub layer_index: u32,
    pub mapping: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::emotion::Entity",
        from = "Column::EmotionId",
        to = "super::emotion::Column::Id"
    )]
    Emotion
}

impl Related<super::emotion::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Emotion.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}