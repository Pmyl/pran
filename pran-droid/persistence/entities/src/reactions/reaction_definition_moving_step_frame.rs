use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "reaction_definition_moving_step_frames")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: u32,
    pub step_id: String,
    pub reaction_id: String,
    pub frame_start: u16,
    pub frame_end: u16,
    pub image_id: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::reaction_definition_step::Entity",
        from = "Column::StepId",
        to = "super::reaction_definition_step::Column::Id"
    )]
    Step,
    #[sea_orm(
        belongs_to = "super::reaction_definition::Entity",
        from = "Column::ReactionId",
        to = "super::reaction_definition::Column::Id"
    )]
    Reaction
}

impl Related<super::reaction_definition_step::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Step.def()
    }
}

impl Related<super::reaction_definition::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Reaction.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}