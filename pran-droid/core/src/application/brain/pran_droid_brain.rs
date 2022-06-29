use std::sync::Arc;
use crate::domain::brain::builder::PranDroidBrainBuilder;
use crate::domain::brain::pran_droid_brain::{PranDroidBrain, ReactionNotifier};
use crate::domain::reactions::reaction_definition::ReactionTrigger;
use crate::domain::reactions::reaction_definition_repository::ReactionDefinitionRepository;

pub trait TextPhonemiser: Send + Sync {
    fn phonemise_text(&self, text: &str) -> Vec<String>;
}

pub async fn create_droid_brain(reaction_repository: &Arc<dyn ReactionDefinitionRepository>, text_phonemiser: &Arc<dyn TextPhonemiser>, reaction_notifier: &Arc<dyn ReactionNotifier>) -> PranDroidBrain {
    let reactions = reaction_repository.get_all().await;
    let mut brain_builder = PranDroidBrainBuilder::new(text_phonemiser.clone(), reaction_notifier.clone());

    for reaction in reactions {
        if reaction.triggers.iter().any(|trigger| matches!(trigger, ReactionTrigger::ChatCommand(_)) || matches!(trigger, ReactionTrigger::ChatKeyword(_))) {
            brain_builder.with_reaction(reaction)
        }
    }

    brain_builder.build()
}

#[cfg(test)]
mod tests {
    use std::sync::Mutex;
    use crate::domain::animations::animation::{Animation, AnimationFrame, AnimationFrames};
    use crate::domain::brain::pran_droid_brain::ReactionNotifier;
    use crate::domain::brain::stimuli::{ChatMessageStimulus, Source, Stimulus};
    use crate::domain::emotions::emotion::EmotionId;
    use crate::domain::images::image::ImageId;
    use crate::domain::reactions::reaction::{Milliseconds, TalkingReactionStep, Reaction, ReactionStepSkip, ReactionStep, ReactionStepText};
    use crate::domain::reactions::reaction_definition::{MovingReactionStepDefinition, ReactionDefinition, ReactionDefinitionId, ReactionStepDefinition, TalkingReactionStepDefinition};
    use crate::domain::reactions::reaction_definition_repository::tests::{setup_dummy_chat_command_reaction_definitions, setup_dummy_chat_keyword_reaction_definitions};
    use crate::persistence::reactions::in_memory_reaction_repository::InMemoryReactionRepository;
    use super::*;

    #[tokio::test]
    async fn create_droid_brain_reacts_to_stored_chat_command_reactions() {
        let reaction_repository: Arc<dyn ReactionDefinitionRepository> = Arc::new(InMemoryReactionRepository::new());
        let text_phonemiser: Arc<dyn TextPhonemiser> = Arc::new(SplitLettersTextPhonemiser {});
        setup_dummy_chat_command_reaction_definitions(vec!["!hello", "!hug"], &reaction_repository).await;

        let mut brain = create_droid_brain(&reaction_repository, &text_phonemiser, &create_dummy_notifier()).await;

        let reaction_hello = stimulate_with_chat_message(&mut brain, |stimulus| stimulus.text = String::from("!hello"));
        let reaction_hug = stimulate_with_chat_message(&mut brain, |stimulus| stimulus.text = String::from("!hug"));
        let reaction_else = stimulate_with_chat_message(&mut brain, |stimulus| stimulus.text = String::from("!else"));

        assert!(reaction_hello.is_some());
        assert!(reaction_hug.is_some());
        assert!(reaction_else.is_none());
    }

    #[tokio::test]
    async fn create_droid_brain_chat_command_react_only_if_message_starts_with_it() {
        let reaction_repository: Arc<dyn ReactionDefinitionRepository> = Arc::new(InMemoryReactionRepository::new());
        let text_phonemiser: Arc<dyn TextPhonemiser> = Arc::new(SplitLettersTextPhonemiser {});
        setup_dummy_chat_command_reaction_definitions(vec!["!hello"], &reaction_repository).await;

        let mut brain = create_droid_brain(&reaction_repository, &text_phonemiser, &create_dummy_notifier()).await;

        let reaction_start = stimulate_with_chat_message(&mut brain, |stimulus| stimulus.text = String::from("!hello"));
        let reaction_start_connected = stimulate_with_chat_message(&mut brain, |stimulus| stimulus.text = String::from("!helloSome"));
        let reaction_not_start = stimulate_with_chat_message(&mut brain, |stimulus| stimulus.text = String::from("some words !hello"));

        assert!(reaction_start.is_some());
        assert!(reaction_start_connected.is_none());
        assert!(reaction_not_start.is_none());
    }

    #[tokio::test]
    async fn create_droid_brain_chat_keyword_react_if_message_contains_it() {
        let reaction_repository: Arc<dyn ReactionDefinitionRepository> = Arc::new(InMemoryReactionRepository::new());
        let text_phonemiser: Arc<dyn TextPhonemiser> = Arc::new(SplitLettersTextPhonemiser {});
        setup_dummy_chat_keyword_reaction_definitions(vec!["hello message"], &reaction_repository).await;

        let mut brain = create_droid_brain(&reaction_repository, &text_phonemiser, &create_dummy_notifier()).await;

        let reaction_not_contain = stimulate_with_chat_message(&mut brain, |stimulus|
            stimulus.text = String::from("message hello"));
        let reaction_touch_other = stimulate_with_chat_message(&mut brain, |stimulus|
            stimulus.text = String::from("some hello message2"));
        let reaction_contains = stimulate_with_chat_message(&mut brain, |stimulus|
            stimulus.text = String::from("some hello message"));

        assert!(reaction_not_contain.is_none());
        assert!(reaction_touch_other.is_none());
        assert!(reaction_contains.is_some());
    }

    #[tokio::test]
    async fn create_droid_brain_reacts_to_stimulus_with_defined_moving_steps() {
        let reaction_repository: Arc<dyn ReactionDefinitionRepository> = Arc::new(InMemoryReactionRepository::new());
        let text_phonemiser: Arc<dyn TextPhonemiser> = Arc::new(SplitLettersTextPhonemiser {});
        let mut reaction_definition = ReactionDefinition::new_empty(
            ReactionDefinitionId(String::from("0")),
            ReactionTrigger::new_chat_command(String::from("!hello")).unwrap(),
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
        reaction_repository.insert(&reaction_definition).await.unwrap();

        let mut brain = create_droid_brain(&reaction_repository, &text_phonemiser, &create_dummy_notifier()).await;

        let reaction = stimulate_with_chat_message(&mut brain, |stimulus| stimulus.text = String::from("!hello"));

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

    #[tokio::test]
    async fn create_droid_brain_reacts_to_stimulus_with_defined_talking_steps() {
        let reaction_repository: Arc<dyn ReactionDefinitionRepository> = Arc::new(InMemoryReactionRepository::new());
        let text_phonemiser: Arc<dyn TextPhonemiser> = Arc::new(SplitLettersTextPhonemiser {});
        let mut reaction_definition = ReactionDefinition::new_empty(
            ReactionDefinitionId(String::from("0")),
            ReactionTrigger::new_chat_command(String::from("!hello")).unwrap(),
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
        reaction_repository.insert(&reaction_definition).await.unwrap();

        let mut brain = create_droid_brain(&reaction_repository, &text_phonemiser, &create_dummy_notifier()).await;

        let reaction = stimulate_with_chat_message(&mut brain, |stimulus| stimulus.text = String::from("!hello"));

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

    #[tokio::test]
    async fn create_droid_brain_talking_reaction_phonemise_text() {
        let reaction_repository: Arc<dyn ReactionDefinitionRepository> = Arc::new(InMemoryReactionRepository::new());
        let text_phonemiser: Arc<dyn TextPhonemiser> = Arc::new(SplitLettersTextPhonemiser {});
        let mut reaction_definition = ReactionDefinition::new_empty(
            ReactionDefinitionId(String::from("0")),
            ReactionTrigger::new_chat_command(String::from("!hello")).unwrap(),
        );
        reaction_definition.steps.push(ReactionStepDefinition::Talking(TalkingReactionStepDefinition {
            skip: ReactionStepSkip::ImmediatelyAfter,
            text: ReactionStepText::LetterByLetter(String::from("some text")),
            emotion_id: EmotionId(String::from("an emotion id"))
        }));
        reaction_repository.insert(&reaction_definition).await.unwrap();

        let mut brain = create_droid_brain(&reaction_repository, &text_phonemiser, &create_dummy_notifier()).await;

        let reaction = stimulate_with_chat_message(&mut brain, |stimulus| stimulus.text = String::from("!hello"));

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

    #[tokio::test]
    async fn create_droid_brain_talking_reaction_interpolate_chat_message_with_user() {
        let reaction_repository: Arc<dyn ReactionDefinitionRepository> = Arc::new(InMemoryReactionRepository::new());
        let text_phonemiser: Arc<dyn TextPhonemiser> = Arc::new(SplitLettersTextPhonemiser {});
        let mut reaction_definition = ReactionDefinition::new_empty(
            ReactionDefinitionId(String::from("0")),
            ReactionTrigger::new_chat_command(String::from("!hello")).unwrap(),
        );
        reaction_definition.steps.push(ReactionStepDefinition::Talking(TalkingReactionStepDefinition {
            skip: ReactionStepSkip::ImmediatelyAfter,
            text: ReactionStepText::LetterByLetter(String::from("Hello I am ${user}")),
            emotion_id: EmotionId(String::from("an emotion id"))
        }));
        reaction_repository.insert(&reaction_definition).await.unwrap();

        let mut brain = create_droid_brain(&reaction_repository, &text_phonemiser, &create_dummy_notifier()).await;

        let reaction = stimulate_with_chat_message(&mut brain, |stimulus| {
            stimulus.text = String::from("!hello");
            stimulus.source.user_name = String::from("Pmyl")
        });

        assert!(reaction.is_some());
        if let Some(reaction) = reaction {
            assert_eq!(reaction.steps.len(), 1);
            assert!(matches!(&reaction.steps[0], &ReactionStep::Talking(_)));
            if let ReactionStep::Talking(TalkingReactionStep { text, .. }) = &reaction.steps[0] {
                assert_eq!(text.get_text(), "Hello I am Pmyl");
            }
        }
    }

    #[tokio::test]
    async fn create_droid_brain_talking_reaction_interpolate_chat_message_with_target() {
        let reaction_repository: Arc<dyn ReactionDefinitionRepository> = Arc::new(InMemoryReactionRepository::new());
        let text_phonemiser: Arc<dyn TextPhonemiser> = Arc::new(SplitLettersTextPhonemiser {});
        let mut reaction_definition = ReactionDefinition::new_empty(
            ReactionDefinitionId(String::from("0")),
            ReactionTrigger::new_chat_command(String::from("!hello")).unwrap(),
        );
        reaction_definition.steps.push(ReactionStepDefinition::Talking(TalkingReactionStepDefinition {
            skip: ReactionStepSkip::ImmediatelyAfter,
            text: ReactionStepText::LetterByLetter(String::from("Hello ${target}!")),
            emotion_id: EmotionId(String::from("an emotion id"))
        }));
        reaction_repository.insert(&reaction_definition).await.unwrap();

        let mut brain = create_droid_brain(&reaction_repository, &text_phonemiser, &create_dummy_notifier()).await;

        let reaction = stimulate_with_chat_message(&mut brain, |stimulus| stimulus.text = String::from("!hello Pmyl"));

        assert!(reaction.is_some());
        if let Some(reaction) = reaction {
            assert_eq!(reaction.steps.len(), 1);
            assert!(matches!(&reaction.steps[0], &ReactionStep::Talking(_)));
            if let ReactionStep::Talking(TalkingReactionStep { text, .. }) = &reaction.steps[0] {
                assert_eq!(text.get_text(), "Hello Pmyl!");
            }
        }
    }

    #[tokio::test]
    async fn create_droid_brain_talking_reaction_interpolate_chat_message_with_count() {
        let reaction_repository: Arc<dyn ReactionDefinitionRepository> = Arc::new(InMemoryReactionRepository::new());
        let text_phonemiser: Arc<dyn TextPhonemiser> = Arc::new(SplitLettersTextPhonemiser {});
        let mut reaction_definition = ReactionDefinition::new_empty(
            ReactionDefinitionId(String::from("0")),
            ReactionTrigger::new_chat_command(String::from("!count")).unwrap(),
        );
        reaction_definition.count = 3;
        reaction_definition.steps.push(ReactionStepDefinition::Talking(TalkingReactionStepDefinition {
            skip: ReactionStepSkip::ImmediatelyAfter,
            text: ReactionStepText::LetterByLetter(String::from("${count}")),
            emotion_id: EmotionId(String::from("an emotion id"))
        }));
        reaction_repository.insert(&reaction_definition).await.unwrap();

        let mut brain = create_droid_brain(&reaction_repository, &text_phonemiser, &create_dummy_notifier()).await;

        let reaction = stimulate_with_chat_message(&mut brain, |stimulus| stimulus.text = String::from("!count"));

        assert!(reaction.is_some());
        if let Some(reaction) = reaction {
            assert_eq!(reaction.steps.len(), 1);
            assert!(matches!(&reaction.steps[0], &ReactionStep::Talking(_)));
            if let ReactionStep::Talking(TalkingReactionStep { text, .. }) = &reaction.steps[0] {
                assert_eq!(text.get_text(), "4");
            }
        }

        let reaction = stimulate_with_chat_message(&mut brain, |stimulus| stimulus.text = String::from("!count"));

        assert!(reaction.is_some());
        if let Some(reaction) = reaction {
            assert_eq!(reaction.steps.len(), 1);
            assert!(matches!(&reaction.steps[0], &ReactionStep::Talking(_)));
            if let ReactionStep::Talking(TalkingReactionStep { text, .. }) = &reaction.steps[0] {
                assert_eq!(text.get_text(), "5");
            }
        }
    }

    #[tokio::test]
    async fn create_droid_brain_talking_reaction_notify_new_usage_count() {
        let reaction_repository: Arc<dyn ReactionDefinitionRepository> = Arc::new(InMemoryReactionRepository::new());
        let text_phonemiser: Arc<dyn TextPhonemiser> = Arc::new(SplitLettersTextPhonemiser {});
        let mut reaction_definition = ReactionDefinition::new_empty(
            ReactionDefinitionId(String::from("0")),
            ReactionTrigger::new_chat_command(String::from("!acommand")).unwrap(),
        );
        reaction_definition.count = 2;
        reaction_definition.steps.push(ReactionStepDefinition::Talking(TalkingReactionStepDefinition {
            skip: ReactionStepSkip::ImmediatelyAfter,
            text: ReactionStepText::LetterByLetter(String::from("a text")),
            emotion_id: EmotionId(String::from("an emotion id"))
        }));
        reaction_repository.insert(&reaction_definition).await.unwrap();
        let fake_notifier = Arc::new(FakeNotifier::new());

        let mut brain = create_droid_brain(&reaction_repository, &text_phonemiser, &(fake_notifier.clone() as Arc<dyn ReactionNotifier>)).await;

        stimulate_with_chat_message(&mut brain, |stimulus| stimulus.text = String::from("!acommand"));
        stimulate_with_chat_message(&mut brain, |stimulus| stimulus.text = String::from("!acommand"));

        assert_eq!(fake_notifier.count_notifications.lock().unwrap().to_vec(), vec![3, 4]);
    }

    #[tokio::test]
    async fn create_droid_brain_talking_reaction_interpolate_chat_message_with_touser_user_if_target_missing() {
        let reaction_repository: Arc<dyn ReactionDefinitionRepository> = Arc::new(InMemoryReactionRepository::new());
        let text_phonemiser: Arc<dyn TextPhonemiser> = Arc::new(SplitLettersTextPhonemiser {});
        let mut reaction_definition = ReactionDefinition::new_empty(
            ReactionDefinitionId(String::from("0")),
            ReactionTrigger::new_chat_command(String::from("!hello")).unwrap(),
        );
        reaction_definition.steps.push(ReactionStepDefinition::Talking(TalkingReactionStepDefinition {
            skip: ReactionStepSkip::ImmediatelyAfter,
            text: ReactionStepText::LetterByLetter(String::from("Hello ${touser}!")),
            emotion_id: EmotionId(String::from("an emotion id"))
        }));
        reaction_repository.insert(&reaction_definition).await.unwrap();

        let mut brain = create_droid_brain(&reaction_repository, &text_phonemiser, &create_dummy_notifier()).await;

        let reaction = stimulate_with_chat_message(&mut brain, |stimulus| {
            stimulus.text = String::from("!hello");
            stimulus.source.user_name = String::from("Pmyl");
        });

        assert!(reaction.is_some());
        if let Some(reaction) = reaction {
            assert_eq!(reaction.steps.len(), 1);
            assert!(matches!(&reaction.steps[0], &ReactionStep::Talking(_)));
            if let ReactionStep::Talking(TalkingReactionStep { text, .. }) = &reaction.steps[0] {
                assert_eq!(text.get_text(), "Hello Pmyl!");
            }
        }
    }

    #[tokio::test]
    async fn create_droid_brain_talking_reaction_interpolate_chat_message_with_touser_target_if_present() {
        let reaction_repository: Arc<dyn ReactionDefinitionRepository> = Arc::new(InMemoryReactionRepository::new());
        let text_phonemiser: Arc<dyn TextPhonemiser> = Arc::new(SplitLettersTextPhonemiser {});
        let mut reaction_definition = ReactionDefinition::new_empty(
            ReactionDefinitionId(String::from("0")),
            ReactionTrigger::new_chat_command(String::from("!hello")).unwrap(),
        );
        reaction_definition.steps.push(ReactionStepDefinition::Talking(TalkingReactionStepDefinition {
            skip: ReactionStepSkip::ImmediatelyAfter,
            text: ReactionStepText::LetterByLetter(String::from("Hello ${touser}!")),
            emotion_id: EmotionId(String::from("an emotion id"))
        }));
        reaction_repository.insert(&reaction_definition).await.unwrap();

        let mut brain = create_droid_brain(&reaction_repository, &text_phonemiser, &create_dummy_notifier()).await;

        let reaction = stimulate_with_chat_message(&mut brain, |stimulus| {
            stimulus.text = String::from("!hello PranDroid");
            stimulus.source.user_name = String::from("Pmyl");
        });

        assert!(reaction.is_some());
        if let Some(reaction) = reaction {
            assert_eq!(reaction.steps.len(), 1);
            assert!(matches!(&reaction.steps[0], &ReactionStep::Talking(_)));
            if let ReactionStep::Talking(TalkingReactionStep { text, .. }) = &reaction.steps[0] {
                assert_eq!(text.get_text(), "Hello PranDroid!");
            }
        }
    }

    #[tokio::test]
    async fn create_droid_brain_talking_reaction_interpolate_chat_message_before_phonemising_text() {
        let reaction_repository: Arc<dyn ReactionDefinitionRepository> = Arc::new(InMemoryReactionRepository::new());
        let text_phonemiser: Arc<dyn TextPhonemiser> = Arc::new(SplitLettersTextPhonemiser {});
        let mut reaction_definition = ReactionDefinition::new_empty(
            ReactionDefinitionId(String::from("0")),
            ReactionTrigger::new_chat_command(String::from("!hello")).unwrap(),
        );
        reaction_definition.steps.push(ReactionStepDefinition::Talking(TalkingReactionStepDefinition {
            skip: ReactionStepSkip::ImmediatelyAfter,
            text: ReactionStepText::LetterByLetter(String::from("Hello ${user}!")),
            emotion_id: EmotionId(String::from("an emotion id"))
        }));
        reaction_repository.insert(&reaction_definition).await.unwrap();

        let mut brain = create_droid_brain(&reaction_repository, &text_phonemiser, &create_dummy_notifier()).await;

        let reaction = stimulate_with_chat_message(&mut brain, |stimulus| {
            stimulus.text = String::from("!hello");
            stimulus.source.user_name = String::from("Pmyl");
        });

        assert!(reaction.is_some());
        if let Some(reaction) = reaction {
            assert_eq!(reaction.steps.len(), 1);
            assert!(matches!(&reaction.steps[0], &ReactionStep::Talking(_)));
            if let ReactionStep::Talking(TalkingReactionStep { phonemes, .. }) = &reaction.steps[0] {
                assert_eq!(
                    phonemes.into_iter().map(|s| s.as_str()).collect::<Vec<&str>>().as_slice(),
                    vec!["H", "e", "l", "l", "o", " ", "P", "m", "y", "l", "!"]
                );
            }
        }
    }

    fn stimulate_with_chat_message<F>(brain: &mut PranDroidBrain, func: F) -> Option<Reaction> where F: Fn(&mut ChatMessageStimulus) -> () {
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
        fn phonemise_text(&self, text: &str) -> Vec<String> {
            text.chars().map(|s| s.to_string()).collect()
        }
    }

    struct FakeNotifier { count_notifications: Mutex<Vec<u32>> }
    impl ReactionNotifier for FakeNotifier {
        fn notify_reaction_usage(&self, _reaction_definition_id: &ReactionDefinitionId, new_count: u32) {
            let lock = self.count_notifications.lock();
            lock.unwrap().push(new_count);
        }
    }
    impl FakeNotifier {
        fn new() -> Self { Self { count_notifications: Mutex::new(vec![]) } }
    }

    fn create_dummy_notifier() -> Arc<dyn ReactionNotifier> {
        Arc::new(FakeNotifier::new())
    }
}