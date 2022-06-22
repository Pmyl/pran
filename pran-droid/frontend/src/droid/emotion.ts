import { clear, drawId, ManagerTimelineAction, MS_TO_FRAMES, wait } from 'pran-animation-frontend';
import { cmuPhonemesMap, MapOutput, phonemesMapper } from 'pran-phonemes-frontend';
import { AnimationRun } from '../animation/run/animation-run';
import { StepAnimationRun } from '../animation/run/step/step-animation-run';
import { SingleAnimationStepper } from '../animation/run/step/stepper/single-animation-stepper';

export const enum EmotionLayer {
  Mouth,
  Animation
}

export type EmotionLayers = ({ type: EmotionLayer.Mouth, mouthMapping?: { [key: string]: string } } | { type: EmotionLayer.Animation, animation: () => ManagerTimelineAction[] })[];

export interface Emotion {
  speak(phonemes: string[], durationMs: number): AnimationRun;
}

export class ConfigurableEmotion implements Emotion {
  private _emotionLayers: EmotionLayers;

  constructor(emotionLayers: EmotionLayers) {
    this._emotionLayers = emotionLayers;
  }

  public speak(phonemes: string[], durationMs: number): AnimationRun {
    return StepAnimationRun.animating(SingleAnimationStepper.create({
      fps: 60,
      layers: this._emotionLayers.map(layer => {
        switch (layer.type) {
          case EmotionLayer.Mouth:
            return this._createMouthLayer(phonemes, durationMs, layer.mouthMapping);
          case EmotionLayer.Animation:
            return { actions: layer.animation(), loop: true }
        }
      })
    }));
  }

  private _createMouthLayer(phonemes: string[], durationMs: number, mouthMapping: { [p: string]: string } | undefined) {
    const mouthMovementsMapping: MapOutput[] = phonemesMapper(phonemes, cmuPhonemesMap);
    let totalFrames: number = durationMs * MS_TO_FRAMES;
    let mouthPositionsLeft: number = mouthMovementsMapping.length;

    const talkingActions: ManagerTimelineAction[] = mouthMovementsMapping.flatMap(mapping => {
      const frames: number = Math.round(totalFrames / mouthPositionsLeft);
      mouthPositionsLeft--;
      if (frames === 0) {
        return [];
      }

      totalFrames -= frames;
      let imageId = mouthMapping ? mouthMapping[mapping.output] : mapping.output;
      const actions: ManagerTimelineAction[] = [imageId ? drawId(imageId) : clear()];
      if (frames > 0) {
        actions.push(wait(frames - 1));
      }

      return actions;
    });
    talkingActions.push(drawId(mouthMapping['smile']));

    return talkingActions;
  }
}