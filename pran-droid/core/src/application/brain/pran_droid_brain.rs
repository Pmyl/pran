use std::sync::Arc;
use crate::domain::brain::builder::PranDroidBrainBuilder;
use crate::domain::brain::pran_droid_brain::PranDroidBrain;
use crate::domain::reactions::reaction_definition::ReactionTrigger;
use crate::domain::reactions::reaction_definition_repository::ReactionDefinitionRepository;

pub trait TextPhonemiser: Send + Sync {
    fn phonemise_text(&self, text: String) -> Vec<String>;
}

pub fn create_droid_brain(reaction_repository: &Arc<dyn ReactionDefinitionRepository>, text_phonemiser: &Arc<dyn TextPhonemiser>) -> PranDroidBrain {
    let reactions = reaction_repository.get_all();
    let mut brain_builder = PranDroidBrainBuilder::new(text_phonemiser.clone());

    for reaction in reactions {
        match reaction.trigger {
            ReactionTrigger::Chat(_) => {
                brain_builder.with_reaction_to_chat(reaction)
            }
        }
    }

    brain_builder.build()
}

#[cfg(test)]
mod tests {
    use crate::domain::animations::animation::{Animation, AnimationFrame, AnimationFrames};
    use crate::domain::brain::stimuli::{ChatMessageStimulus, Source, Stimulus};
    use crate::domain::emotions::emotion::EmotionId;
    use crate::domain::images::image::ImageId;
    use crate::domain::reactions::reaction::{Milliseconds, TalkingReactionStep, Reaction, ReactionStepSkip, ReactionStep, ReactionStepText};
    use crate::domain::reactions::reaction_definition::{MovingReactionStepDefinition, ReactionDefinition, ReactionDefinitionId, ReactionStepDefinition, TalkingReactionStepDefinition};
    use crate::domain::reactions::reaction_definition_repository::tests::{setup_dummy_chat_reaction_definitions};
    use crate::persistence::reactions::in_memory_reaction_repository::InMemoryReactionRepository;
    use super::*;

    #[test]
    fn create_droid_brain_reacts_to_stored_chat_reactions() {
        let reaction_repository: Arc<dyn ReactionDefinitionRepository> = Arc::new(InMemoryReactionRepository::new());
        let text_phonemiser: Arc<dyn TextPhonemiser> = Arc::new(SplitLettersTextPhonemiser {});
        setup_dummy_chat_reaction_definitions(vec!["!hello", "!hug"], &reaction_repository);

        let brain = create_droid_brain(&reaction_repository, &text_phonemiser);

        let reaction_hello = stimulate_with_chat_message(&brain, |stimulus| stimulus.text = String::from("!hello"));
        let reaction_hug = stimulate_with_chat_message(&brain, |stimulus| stimulus.text = String::from("!hug"));
        let reaction_else = stimulate_with_chat_message(&brain, |stimulus| stimulus.text = String::from("!else"));

        assert!(reaction_hello.is_some());
        assert!(reaction_hug.is_some());
        assert!(reaction_else.is_none());
    }

    #[test]
    fn create_droid_brain_reacts_to_stimulus_with_defined_moving_steps() {
        let reaction_repository: Arc<dyn ReactionDefinitionRepository> = Arc::new(InMemoryReactionRepository::new());
        let text_phonemiser: Arc<dyn TextPhonemiser> = Arc::new(SplitLettersTextPhonemiser {});
        let mut reaction_definition = ReactionDefinition::new_empty(
            ReactionDefinitionId(String::from("0")),
            ReactionTrigger::new_chat(String::from("!hello")).unwrap(),
        );
        reaction_definition.steps.push(ReactionStepDefinition::Moving(MovingReactionStepDefinition {
            skip: ReactionStepSkip::ImmediatelyAfter,
            animation: Animation {
                frames: AnimationFrames(vec![
                    AnimationFrame { frame_start: 0, frame_end: 11, image_id: ImageId(String::from("an image id")), }
                ])
            }
        }));
        reaction_definition.steps.push(ReactionStepDefinition::Moving(MovingReactionStepDefinition {
            skip: ReactionStepSkip::AfterMilliseconds(Milliseconds(15)),
            animation: Animation {
                frames: AnimationFrames(vec![
                    AnimationFrame { frame_start: 12, frame_end: 22, image_id: ImageId(String::from("an image id2")), }
                ])
            }
        }));
        reaction_repository.insert(&reaction_definition).unwrap();

        let brain = create_droid_brain(&reaction_repository, &text_phonemiser);

        let reaction = stimulate_with_chat_message(&brain, |stimulus| stimulus.text = String::from("!hello"));

        assert!(reaction.is_some());
        if let Some(reaction) = reaction {
            assert_eq!(reaction.steps.len(), 2);
            assert!(matches!(reaction.steps[0], ReactionStep::Moving(_)));
            if let ReactionStep::Moving(moving_step) = &reaction.steps[0] {
                assert!(matches!(moving_step.skip, ReactionStepSkip::ImmediatelyAfter));
                assert!(matches!(moving_step.animation.frames.0[..], [
                    AnimationFrame { frame_start: 0, frame_end: 11, image_id: ImageId(ref image_id) }
                ] if image_id == "an image id"));
            }
            assert!(matches!(reaction.steps[1], ReactionStep::Moving(_)));
            if let ReactionStep::Moving(moving_step) = &reaction.steps[1] {
                assert!(matches!(moving_step.skip, ReactionStepSkip::AfterMilliseconds(Milliseconds(15))));
                assert!(matches!(moving_step.animation.frames.0[..], [
                    AnimationFrame { frame_start: 12, frame_end: 22, image_id: ImageId(ref image_id) }
                ] if image_id == "an image id2"));
            }
        }
    }

    #[test]
    fn create_droid_brain_reacts_to_stimulus_with_defined_talking_steps() {
        let reaction_repository: Arc<dyn ReactionDefinitionRepository> = Arc::new(InMemoryReactionRepository::new());
        let text_phonemiser: Arc<dyn TextPhonemiser> = Arc::new(SplitLettersTextPhonemiser {});
        let mut reaction_definition = ReactionDefinition::new_empty(
            ReactionDefinitionId(String::from("0")),
            ReactionTrigger::new_chat(String::from("!hello")).unwrap(),
        );
        reaction_definition.steps.push(ReactionStepDefinition::Talking(TalkingReactionStepDefinition {
            skip: ReactionStepSkip::ImmediatelyAfter,
            text: ReactionStepText::LetterByLetter(String::from("some text")),
            emotion_id: EmotionId(String::from("an emotion id"))
        }));
        reaction_definition.steps.push(ReactionStepDefinition::Talking(TalkingReactionStepDefinition {
            skip: ReactionStepSkip::AfterMilliseconds(Milliseconds(15)),
            text: ReactionStepText::Instant(String::from("some text2")),
            emotion_id: EmotionId(String::from("an emotion id2"))
        }));
        reaction_repository.insert(&reaction_definition).unwrap();

        let brain = create_droid_brain(&reaction_repository, &text_phonemiser);

        let reaction = stimulate_with_chat_message(&brain, |stimulus| stimulus.text = String::from("!hello"));

        assert!(reaction.is_some());
        if let Some(reaction) = reaction {
            assert_eq!(reaction.steps.len(), 2);
            assert!(matches!(reaction.steps[0], ReactionStep::Talking(_)));
            if let ReactionStep::Talking(talking_step) = &reaction.steps[0] {
                assert!(matches!(talking_step.skip, ReactionStepSkip::ImmediatelyAfter));
                assert!(matches!(talking_step.text, ReactionStepText::LetterByLetter(ref text) if text == "some text"));
                assert!(matches!(talking_step.emotion_id, EmotionId(ref emotion_id) if emotion_id == "an emotion id"));
            }
            assert!(matches!(reaction.steps[1], ReactionStep::Talking(_)));
            if let ReactionStep::Talking(talking_step) = &reaction.steps[1] {
                assert!(matches!(talking_step.skip, ReactionStepSkip::AfterMilliseconds(Milliseconds(15))));
                assert!(matches!(talking_step.text, ReactionStepText::Instant(ref text) if text == "some text2"));
                assert!(matches!(talking_step.emotion_id, EmotionId(ref emotion_id) if emotion_id == "an emotion id2"));
            }
        }
    }

    #[test]
    fn create_droid_brain_talking_reaction_phonemise_text() {
        let reaction_repository: Arc<dyn ReactionDefinitionRepository> = Arc::new(InMemoryReactionRepository::new());
        let text_phonemiser: Arc<dyn TextPhonemiser> = Arc::new(SplitLettersTextPhonemiser {});
        let mut reaction_definition = ReactionDefinition::new_empty(
            ReactionDefinitionId(String::from("0")),
            ReactionTrigger::new_chat(String::from("!hello")).unwrap(),
        );
        reaction_definition.steps.push(ReactionStepDefinition::Talking(TalkingReactionStepDefinition {
            skip: ReactionStepSkip::ImmediatelyAfter,
            text: ReactionStepText::LetterByLetter(String::from("some text")),
            emotion_id: EmotionId(String::from("an emotion id"))
        }));
        reaction_repository.insert(&reaction_definition).unwrap();

        let brain = create_droid_brain(&reaction_repository, &text_phonemiser);

        let reaction = stimulate_with_chat_message(&brain, |stimulus| stimulus.text = String::from("!hello"));

        assert!(reaction.is_some());
        if let Some(reaction) = reaction {
            assert_eq!(reaction.steps.len(), 1);
            assert!(matches!(&reaction.steps[0], &ReactionStep::Talking(_)));
            if let ReactionStep::Talking(TalkingReactionStep { phonemes, .. }) = &reaction.steps[0] {
                assert_eq!(phonemes.len(), 9);
                assert_eq!(phonemes.into_iter().map(|s| s.as_str()).collect::<Vec<&str>>().as_slice(), ["s", "o", "m", "e", " ", "t", "e", "x", "t"]);
            }
        }
    }

    fn stimulate_with_chat_message<F>(brain: &PranDroidBrain, func: F) -> Option<Reaction> where F: Fn(&mut ChatMessageStimulus) -> () {
        brain.stimulate(create_chat_stimulus(func))
    }

    fn create_chat_stimulus<F>(func: F) -> Stimulus where F: Fn(&mut ChatMessageStimulus) -> () {
        let mut chat_message_stimulus = ChatMessageStimulus {
            text: String::from("_a trigger_"),
            source: Source { user_name: String::from("_a name_"), is_mod: false }
        };
        func(&mut chat_message_stimulus);

        Stimulus::ChatMessage(chat_message_stimulus)
    }

    struct SplitLettersTextPhonemiser {}

    impl TextPhonemiser for SplitLettersTextPhonemiser {
        fn phonemise_text(&self, text: String) -> Vec<String> {
            text.chars().map(|s| s.to_string()).collect()
        }
    }
}