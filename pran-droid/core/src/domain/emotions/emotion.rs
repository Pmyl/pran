use std::collections::HashMap;
use crate::domain::animations::animation::Animation;
use crate::domain::images::image::ImageId;

#[derive(Clone, Debug)]
pub struct Emotion {
    pub id: EmotionId,
    pub name: EmotionName,
    pub animation: Vec<EmotionLayer>
}

#[derive(Clone, Debug, PartialEq)]
pub struct EmotionId(pub String);

#[derive(Clone, Debug, PartialEq)]
pub struct EmotionName(pub String);

#[derive(Clone, Debug, PartialEq, Eq, Hash)]
pub enum MouthPositionName {
    FV,
    UR,
    STCh,
    MBSilent,
    P1,
    P2,
    E,
    AAh,
    O,
    LD,
    Pause,
    Smile
}

#[derive(Clone, Debug)]
pub enum EmotionLayer {
    Animation(Animation),
    Mouth { mouth_mapping: HashMap<MouthPositionName, ImageId> }
}

impl Emotion {
    pub(crate) fn new_empty(id: EmotionId, name: EmotionName) -> Self {
        Emotion {
            id,
            name,
            animation: vec![EmotionLayer::Mouth { mouth_mapping: HashMap::new() }],
        }
    }

    pub(crate) fn update_layer(&mut self, index: usize, animation: Animation) -> Result<(), ()> {
        if self.animation.len() == index {
            self.animation.push(EmotionLayer::Animation(animation));
            Ok(())
        } else if self.animation.len() < index || matches!(self.animation[index], EmotionLayer::Mouth { .. }) {
            Err(())
        } else {
            self.animation.remove(index);
            self.animation.insert(index, EmotionLayer::Animation(animation));
            Ok(())
        }
    }

    pub(super) fn set_mouth_position(&mut self, position_name: MouthPositionName, image_id: ImageId) {
        let mouth_index = self.animation.iter().position(|layer| matches!(layer, EmotionLayer::Mouth { .. })).unwrap();
        let mouth_layer = self.animation.get_mut(mouth_index).unwrap();

        match mouth_layer {
            EmotionLayer::Animation(_) => {}
            EmotionLayer::Mouth { ref mut mouth_mapping } => {
                if mouth_mapping.contains_key(&position_name) {
                    mouth_mapping.remove(&position_name);
                }

                mouth_mapping.insert(position_name, image_id);
            }
        }
    }
}

impl EmotionName {
    pub fn new(name: String) -> Result<Self, ()> {
        if name.is_empty() {
            return Err(())
        }

        Ok(EmotionName(name))
    }
}

impl Into<String> for MouthPositionName {
    fn into(self) -> String {
        match self {
            MouthPositionName::FV => String::from("fv"),
            MouthPositionName::UR => String::from("ur"),
            MouthPositionName::STCh => String::from("stch"),
            MouthPositionName::MBSilent => String::from("mbsilent"),
            MouthPositionName::P1 => String::from("p1"),
            MouthPositionName::P2 => String::from("p2"),
            MouthPositionName::E => String::from("e"),
            MouthPositionName::AAh => String::from("aah"),
            MouthPositionName::O => String::from("o"),
            MouthPositionName::LD => String::from("ld"),
            MouthPositionName::Pause => String::from("pause"),
            MouthPositionName::Smile => String::from("smile"),
        }
    }
}

impl TryFrom<String> for MouthPositionName {
    type Error = ();

    fn try_from(position_name: String) -> Result<Self, Self::Error> {
        match position_name.as_ref() {
            "fv" => Ok(MouthPositionName::FV),
            "ur" => Ok(MouthPositionName::UR),
            "stch" => Ok(MouthPositionName::STCh),
            "mbsilent" => Ok(MouthPositionName::MBSilent),
            "p1" => Ok(MouthPositionName::P1),
            "p2" => Ok(MouthPositionName::P2),
            "e" => Ok(MouthPositionName::E),
            "aah" => Ok(MouthPositionName::AAh),
            "o" => Ok(MouthPositionName::O),
            "ld" => Ok(MouthPositionName::LD),
            "pause" => Ok(MouthPositionName::Pause),
            "smile" => Ok(MouthPositionName::Smile),
            _ => Err(())
        }
    }
}
