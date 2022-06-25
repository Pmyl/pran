use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "reaction_definition_steps")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: String,
    pub step_index: u32,
    pub reaction_id: String,
    pub step_type: String,
    pub skip: String,
    pub emotion_id: Option<String>,
    pub text: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::reaction_definition::Entity",
        from = "Column::ReactionId",
        to = "super::reaction_definition::Column::Id"
    )]
    Reaction,
    #[sea_orm(has_many = "super::reaction_definition_moving_step_frame::Entity")]
    Frame,
}

impl Related<super::reaction_definition::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Reaction.def()
    }
}

impl Related<super::reaction_definition_moving_step_frame::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Frame.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}