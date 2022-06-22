import { AnimationRun } from '../animation/run/animation-run';
import { StepAnimationRun } from '../animation/run/step/step-animation-run';
import { SingleAnimationStepper } from '../animation/run/step/stepper/single-animation-stepper';
import { PranDroid } from '../droid/droid';
import { PranDroidReaction, ReactionType, TalkingReaction } from '../droid/reaction';
import { animationToTimelineActions } from '../helpers/animation-to-timeline-action';
import { BrainAnimation, BrainWebSocket } from './brain-web-socket';

export function connectToBrain(pranDroid: PranDroid) {
  new BrainWebSocket(reaction => {
    const steps: PranDroidReaction[] = reaction.steps.map(step => {
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

    pranDroid.react(steps);
  });
}

function getAnimation(animation: BrainAnimation): AnimationRun {
  return StepAnimationRun.animating(SingleAnimationStepper.create({
    fps: 60,
    layers: [
      {
        loop: false,
        actions: animationToTimelineActions(animation)
      }
    ]
  }));
}