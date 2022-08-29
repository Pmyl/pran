import { Animator, AnimatorManager, CanvasControllerFactory } from 'pran-animation-frontend';
import { Container } from 'pran-gular-frontend';
import { PlayerController } from '../animation/player-controller';
import { PranDroidAnimationPlayer } from '../animation/pran-droid-animation-player';
import { animationToTimelineActions } from '../helpers/animation-to-timeline-action';
import { retryFetch } from '../helpers/retry-fetch';
import { SpeechBubble } from '../speech-bubble/speech-bubble';
import { PranDroid } from './droid';
import { ConfigurableEmotion, Emotion, EmotionLayer } from './emotion';

export async function buildDroid(pranCanvas: Container, speechBubble: SpeechBubble): Promise<PranDroid> {
  const animationPlayer = await setupPranDroidAnimation(pranCanvas);
  const pranDroid = new PranDroid(animationPlayer, speechBubble);
  const happyEmotion = await setupEmotions(pranDroid, 'happy');
  pranDroid.setIdle(happyEmotion.asIdleAnimation());

  return pranDroid;
}

async function setupPranDroidAnimation(pranCanvas: Container): Promise<PranDroidAnimationPlayer> {
  const images = (await retryFetch('/api/images').then(r => r.json())).data;
  console.log('Images', images);

  const animatorManager: AnimatorManager = await AnimatorManager.create(
    CanvasControllerFactory.createFrom((pranCanvas.componentElement as HTMLCanvasElement).getContext('2d')),
    images.map(data => [data.id, data.url])
  );

  const animator: Animator = animatorManager.animate();

  const playerController: PlayerController = new PlayerController(animator);

  return new PranDroidAnimationPlayer(animator, animatorManager, playerController);
}

async function setupEmotions(pranDroid: PranDroid, idleEmotionName: string): Promise<Emotion> {
  const emotions: {
    id: string,
    name: string,
    layers: ({ type: 'Mouth', id: string, parentId: string, mouthMapping: { [key: string]: string } } | { type: 'Animation', id: string, parentId: string, frames: { frameStart: number, frameEnd: number, imageId: string }[]})[],
  }[] = (await retryFetch('/api/emotions').then(r => r.json())).data;
  emotions.forEach(emotion => emotion.layers.sort((a, b) => a.id !== b.parentId ? 1 : -1));
  console.log('Emotions', emotions);

  pranDroid.setEmotionRange(emotions.reduce((acc, emotion) => {
    acc[emotion.id] = new ConfigurableEmotion(emotion.layers.map(layer => {
      switch (layer.type) {
        case 'Mouth':
          return { type: EmotionLayer.Mouth, id: layer.id, parentId: layer.parentId, mouthMapping: layer.mouthMapping };
        case 'Animation':
          return { type: EmotionLayer.Animation, id: layer.id, parentId: layer.parentId, animation: () => animationToTimelineActions(layer.frames) };
      }
    }));

    return acc;
  }, {}));

  return pranDroid.getEmotionRange()[emotions.find(emotion => emotion.name === idleEmotionName).id];
}
