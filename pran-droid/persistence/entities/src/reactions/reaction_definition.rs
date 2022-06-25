use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "reactions")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "super::reaction_definition_step::Entity")]
    Step,
    #[sea_orm(has_many = "super::reaction_definition_trigger::Entity")]
    Trigger,
    #[sea_orm(has_many = "super::reaction_definition_moving_step_frame::Entity")]
    Frames
}

impl Related<super::reaction_definition_step::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Step.def()
    }
}

impl Related<super::reaction_definition_trigger::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Trigger.def()
    }
}

impl Related<super::reaction_definition_moving_step_frame::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Frames.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}