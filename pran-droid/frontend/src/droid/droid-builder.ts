import { Animator, AnimatorManager, CanvasControllerFactory } from 'pran-animation-frontend';
import { Container } from 'pran-gular-frontend';
import { PlayerController } from '../animation/player-controller';
import { PranDroidAnimationPlayer } from '../animation/pran-droid-animation-player';
import { animationToTimelineActions } from '../helpers/animation-to-timeline-action';
import { retryFetch } from '../helpers/retry-fetch';
import { SpeechBubble } from '../speech-bubble/speech-bubble';
import { PranDroid } from './droid';
import { ConfigurableEmotion, EmotionLayer } from './emotion';

export async function buildDroid(pranCanvas: Container, speechBubble: SpeechBubble): Promise<PranDroid> {
  const animationPlayer = await setupPranDroidAnimation(pranCanvas);
  const pranDroid = new PranDroid(animationPlayer, speechBubble);
  await setupEmotions(pranDroid);

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