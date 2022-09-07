import { AnimationRun } from '../animation/run/animation-run';
import { StepAnimationRun } from '../animation/run/step/step-animation-run';
import { SingleAnimationStepper } from '../animation/run/step/stepper/single-animation-stepper';
import { EmotionApiModel } from '../api-interface/emotions';
import { ConfigurableEmotion, Emotion, EmotionLayer } from '../droid/emotion';
import { PranDroidReaction, ReactionType, TalkingReaction } from '../droid/reaction';
import { animationToTimelineActions } from '../helpers/animation-to-timeline-action';
import { BrainAnimation, DroidBrainReaction } from './brain-web-socket';

export function reactionToPranDroidSteps(brainReaction: DroidBrainReaction): PranDroidReaction[] {
  return brainReaction.steps.map(step => {
    switch (step.type) {
      case ReactionType.Moving:
        return {
          type: ReactionType.Moving,
          movements: getAnimation(step.animation),
          bubble: step.bubble,
          skip: step.skip
        };
      case ReactionType.Talking:
        return {
          type: ReactionType.Talking,
          emotion: step.emotion,
          phonemes: step.phonemes,
          bubble: step.bubble,
          skip: step.skip
        } as TalkingReaction;
      default:
        throw new Error("unhandled step type " + step.type);
    }
  });
}

export function emotionToPranDroidEmotion(apiEmotion: EmotionApiModel): Emotion {
  return new ConfigurableEmotion(apiEmotion.id, apiEmotion.layers.map(layer => {
    switch (layer.type) {
      case 'Mouth':
        return {
          type: EmotionLayer.Mouth,
          id: layer.id,
          parentId: layer.parentId,
          mouthMapping: layer.mouthMapping,
          translations: new Map(Object.entries(layer.translations).map(translation => [+translation[0], translation[1]]))
        };
      case 'Animation':
        return {
          type: EmotionLayer.Animation,
          id: layer.id,
          parentId: layer.parentId,
          animation: () => animationToTimelineActions(layer.frames),
          translations: new Map(Object.entries(layer.translations).map(translation => [+translation[0], translation[1]]))
        };
    }
  }));
}

function getAnimation(animation: BrainAnimation): AnimationRun {
  return StepAnimationRun.animating(SingleAnimationStepper.create({
    fps: 60,
    layers: [
      {
        loop: false,
        actions: animationToTimelineActions(animation),
        translations: new Map()
      }
    ]
  }));
}