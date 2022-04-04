use std::collections::HashMap;
use crate::domain::images::image::ImageId;

pub struct Emotion {
    name: EmotionName,
    mouth_mapping: HashMap<MouthPositionName, ImageId>,
    animation: Vec<EmotionLayer>
}

pub struct EmotionName(String);
pub struct MouthPositionName(String);

pub enum EmotionLayer {
    Animation(EmotionAnimation),
    Mouth
}

pub struct EmotionAnimation {
    actions: Vec<EmotionAnimationAction>
}

pub enum EmotionAnimationAction {
    Id(ImageId),
    None,
    Clear
}
