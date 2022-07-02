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
    Ah,
    B,
    Ee,
    FV,
    K,
    L,
    Oh,
    P1,
    P2,
    S,
    Ur,
    Idle
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

impl Into<String> for &MouthPositionName {
    fn into(self) -> String {
        match self {
            MouthPositionName::Ah => String::from("ah"),
            MouthPositionName::B => String::from("b"),
            MouthPositionName::Ee => String::from("ee"),
            MouthPositionName::FV => String::from("fv"),
            MouthPositionName::K => String::from("k"),
            MouthPositionName::L => String::from("l"),
            MouthPositionName::Oh => String::from("oh"),
            MouthPositionName::P1 => String::from("p1"),
            MouthPositionName::P2 => String::from("p2"),
            MouthPositionName::S => String::from("s"),
            MouthPositionName::Ur => String::from("ur"),
            MouthPositionName::Idle => String::from("idle"),
        }
    }
}

impl Into<String> for MouthPositionName {
    fn into(self) -> String { (&self).into() }
}

impl TryFrom<&String> for MouthPositionName {
    type Error = ();

    fn try_from(position_name: &String) -> Result<Self, Self::Error> {
        match position_name.as_ref() {
            "ah" => Ok(MouthPositionName::Ah),
            "b" => Ok(MouthPositionName::B),
            "ee" => Ok(MouthPositionName::Ee),
            "fv" => Ok(MouthPositionName::FV),
            "k" => Ok(MouthPositionName::K),
            "l" => Ok(MouthPositionName::L),
            "oh" => Ok(MouthPositionName::Oh),
            "p1" => Ok(MouthPositionName::P1),
            "p2" => Ok(MouthPositionName::P2),
            "s" => Ok(MouthPositionName::S),
            "ur" => Ok(MouthPositionName::Ur),
            "idle" => Ok(MouthPositionName::Idle),
            _ => Err(())
        }
    }
}

impl TryFrom<String> for MouthPositionName {
    type Error = ();

    fn try_from(position_name: String) -> Result<Self, Self::Error> {
        (&position_name).try_into()
    }
}
