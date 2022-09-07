import { clear, drawId, ManagerTimelineAction, ManagerTimelineComplex, MS_TO_FRAMES, wait } from 'pran-animation-frontend';
import { cmuPhonemesMap, MapOutput, phonemesMapper } from 'pran-phonemes-frontend';
import { AnimationRun } from '../animation/run/animation-run';
import { StepAnimationRun } from '../animation/run/step/step-animation-run';
import { LoopAnimationStepper } from '../animation/run/step/stepper/loop-animation-stepper';
import { SingleAnimationStepper } from '../animation/run/step/stepper/single-animation-stepper';

export const enum EmotionLayer {
  Mouth,
  Animation
}

export type EmotionLayers = (
  { type: EmotionLayer.Mouth, id: string, parentId: string, mouthMapping?: { [key: string]: string }, translations: Map<number, [number, number]> }
  | { type: EmotionLayer.Animation, id: string, parentId: string, animation: () => ManagerTimelineAction[], translations: Map<number, [number, number]> }
)[];

export interface Emotion {
  id: string;
  speak(phonemes: string[], durationMs: number): AnimationRun;
  asIdleAnimation(): AnimationRun;
}

export class ConfigurableEmotion implements Emotion {
  public id: string;

  private _emotionLayers: EmotionLayers;

  constructor(id: string, emotionLayers: EmotionLayers) {
    this.id = id;
    this._emotionLayers = emotionLayers;
  }

  public speak(phonemes: string[], durationMs: number): AnimationRun {
    return StepAnimationRun.animating(SingleAnimationStepper.create({
      fps: 60,
      layers: this._emotionLayers.map(layer => {
        switch (layer.type) {
          case EmotionLayer.Mouth:
            return { id: layer.id, parentId: layer.parentId, actions: this._createMouthLayer(phonemes, durationMs, layer.mouthMapping), loop: false, translations: layer.translations };
          case EmotionLayer.Animation:
            return { id: layer.id, parentId: layer.parentId, actions: layer.animation(), loop: true, translations: layer.translations } as ManagerTimelineComplex
        }
      })
    }));
  }

  public asIdleAnimation(): AnimationRun {
    return StepAnimationRun.animating(LoopAnimationStepper.create({
      fps: 60,
      layers: this._emotionLayers.map(layer => {
        switch (layer.type) {
          case EmotionLayer.Mouth:
            return { id: layer.id, parentId: layer.parentId, actions: [drawId(layer.mouthMapping['idle'])], loop: true, translations: layer.translations };
          case EmotionLayer.Animation:
            return { id: layer.id, parentId: layer.parentId, actions: layer.animation(), loop: true, translations: layer.translations } as ManagerTimelineComplex
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
    talkingActions.push(drawId(mouthMapping ? mouthMapping['idle'] : 'idle'));

    return talkingActions;
  }
}