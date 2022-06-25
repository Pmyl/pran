use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "emotions")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: String,
    pub name: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "super::emotion_animation_layer::Entity")]
    AnimationLayer,
    #[sea_orm(has_one = "super::emotion_mouth_layer::Entity")]
    MouthLayer
}

impl Related<super::emotion_animation_layer::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::AnimationLayer.def()
    }
}

impl Related<super::emotion_mouth_layer::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::MouthLayer.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}