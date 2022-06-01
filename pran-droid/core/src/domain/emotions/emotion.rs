use std::collections::HashMap;
use crate::domain::images::image::ImageId;

// TODO: to remake, emotion should use the Animation entity instead of creating custom animation structures
// Keeping the layers is not excluded but not necessary at the moment

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
