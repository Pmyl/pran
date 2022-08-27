import { Animator, AnimatorManager, CanvasControllerFactory, drawId, wait } from 'pran-animation-frontend';
import { Container } from 'pran-gular-frontend';
import { randomFramesBetweenInMs } from '../animation/helpers/random';
import { PlayerController } from '../animation/player-controller';
import { PranDroidAnimationPlayer } from '../animation/pran-droid-animation-player';
import { AnimationRun } from '../animation/run/animation-run';
import { StepAnimationRun } from '../animation/run/step/step-animation-run';
import { animationToTimelineActions } from '../helpers/animation-to-timeline-action';
import { retryFetch } from '../helpers/retry-fetch';
import { SpeechBubble } from '../speech-bubble/speech-bubble';
import { PranDroid } from './droid';
import { ConfigurableEmotion, EmotionLayer } from './emotion';
import { testIdleTranslation } from './test-idle-translation';

export async function buildDroid(pranCanvas: Container, speechBubble: SpeechBubble): Promise<PranDroid> {
  const animationPlayer = await setupPranDroidAnimation(pranCanvas);
  const pranDroid = new PranDroid(animationPlayer, speechBubble);
  await setupEmotions(pranDroid);
  pranDroid.setIdle(getIdleAnimation());

  return pranDroid;
}

async function setupPranDroidAnimation(pranCanvas: Container): Promise<PranDroidAnimationPlayer> {
  const images = (await retryFetch("/api/images").then(r => r.json())).data;
  console.log("Images", images);

  const animatorManager: AnimatorManager = await AnimatorManager.create(
    CanvasControllerFactory.createFrom((pranCanvas.componentElement as HTMLCanvasElement).getContext('2d')),
    images.map(data => [data.id, data.url]).concat([
      ['head_idle', './resources/idle_0000.png'],
      ['eyes_open', './resources/eyes/eyes_0000.png'],
      ['eyes_semi_open', './resources/eyes/eyes_0001.png'],
      ['eyes_closed', './resources/eyes/eyes_0002.png'],
    ])
  );

  const animator: Animator = animatorManager.animate();

  const playerController: PlayerController = new PlayerController(animator);

  return new PranDroidAnimationPlayer(animator, animatorManager, playerController);
}

async function setupEmotions(pranDroid: PranDroid): Promise<void> {
  const emotions: {
    id: string,
    name: string,
    layers: ({ type: 'Mouth', mouthMapping: { [key: string]: string } } | { type: 'Animation', frames: { frameStart: number, frameEnd: number, imageId: string }[]})[],
  }[] = (await retryFetch("/api/emotions").then(r => r.json())).data;
  console.log("Emotions", emotions);

  pranDroid.setEmotionRange(emotions.reduce((acc, emotion) => {
    acc[emotion.id] = new ConfigurableEmotion(emotion.layers.map(layer => {
      switch (layer.type) {
        case 'Mouth':
          return { type: EmotionLayer.Mouth, mouthMapping: layer.mouthMapping };
        case 'Animation':
          return { type: EmotionLayer.Animation, animation: () => animationToTimelineActions(layer.frames) };
      }
    }));

    return acc;
  }, {}));
}

// Temporary idle animation, this is going to come from the API when the feature has been added
function getIdleAnimation(): AnimationRun {
  return StepAnimationRun.animating({
    nextStep() {
      const fps = 60;

      return {
        fps: fps,
        layers: [{
          id: 'head',
          actions: [drawId('head_idle')],
          translations: testIdleTranslation,
          loop: true
        }, {
          id: 'mouth',
          parentId: 'head',
          actions: [drawId('happyIdle'), wait(200)],
          loop: false
        }, {
          id: 'eyes',
          parentId: 'head',
          actions: [
            drawId('eyes_open'),
            wait(randomFramesBetweenInMs(1000, 3000, fps)),
            drawId('eyes_semi_open'),
            wait(3),
            drawId('eyes_closed'),
            wait(3),
            drawId('eyes_semi_open'),
            wait(3),
            drawId('eyes_open')
          ],
          translations: [
            [0, [0, 0]],
            [10, [0, 5]],
            [20, [0, 5]],
            [30, [0, 3]],
            [35, [0, 2]],
            [60, [0, -5]],
            [70, [0, -8]],
            [75, [0, -2]],
          ],
          loop: true
        }]
      }
    }
  });
}