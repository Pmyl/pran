import { Animator, AnimatorManager, CanvasControllerFactory } from 'pran-animation-frontend';
import { Container } from 'pran-gular-frontend';
import { PlayerController } from '../animation/player-controller';
import { PranDroidAnimationPlayer } from '../animation/pran-droid-animation-player';
import { getEmotions } from '../api-interface/emotions';
import { emotionToPranDroidEmotion } from '../brain-connection/response-parsers';
import { retryFetch } from '../helpers/retry-fetch';
import { SpeechBubble } from '../speech-bubble/speech-bubble';
import { PranDroid } from './droid';
import { Emotion } from './emotion';

export class PranDroidBuilder {
  private _canvas: Container;
  private _speechBubble: SpeechBubble;
  private _useApiImages: boolean = false;
  private _useApiEmotions: boolean = false;
  private _images: any[] = [];
  private _emotions: Emotion[] = [];

  public static create(pranCanvas: Container, speechBubble: SpeechBubble) {
    return new PranDroidBuilder(pranCanvas, speechBubble);
  }

  private constructor(pranCanvas: Container, speechBubble: SpeechBubble) {
    this._canvas = pranCanvas;
    this._speechBubble = speechBubble;
  }

  public useApiImages(): PranDroidBuilder {
    this._useApiImages = true;
    return this;
  }

  public useCustomImages(images: any[]): PranDroidBuilder {
    this._useApiImages = false;
    this._images = images;
    return this;
  }

  public useApiEmotions(): PranDroidBuilder {
    this._useApiEmotions = true;
    return this;
  }

  public useCustomEmotions(emotions: Emotion[]): PranDroidBuilder {
    this._useApiEmotions = false;
    this._emotions = emotions;
    return this;
  }

  public async build(): Promise<PranDroid> {
    const animationPlayer = await this._setupPranDroidAnimation();
    const pranDroid = new PranDroid(animationPlayer, this._speechBubble);
    const idleEmotion = await this._setupEmotions(pranDroid);
    pranDroid.setIdle(idleEmotion.asIdleAnimation());

    return pranDroid;
  }

  private async _setupPranDroidAnimation(): Promise<PranDroidAnimationPlayer> {
    let images;

    if (this._useApiImages) {
      images = (await retryFetch('/api/images').then(r => r.json())).data;
      console.log('Images', images);
    } else {
      images = this._images;
    }

    const animatorManager: AnimatorManager = await AnimatorManager.create(
      CanvasControllerFactory.createFrom((this._canvas.componentElement as HTMLCanvasElement).getContext('2d')),
      images.map(data => [data.id, data.url])
    );

    const animator: Animator = animatorManager.animate();
    const playerController: PlayerController = new PlayerController(animator);

    return new PranDroidAnimationPlayer(animator, animatorManager, playerController);
  }

  private async _setupEmotions(pranDroid: PranDroid): Promise<Emotion> {
    let emotions: Emotion[];

    if (this._useApiEmotions) {
      const apiEmotions = await getEmotions();
      emotions = apiEmotions.map(emotionToPranDroidEmotion);
    } else {
      emotions = this._emotions;
    }

    pranDroid.setEmotions(emotions);

    return pranDroid.getEmotionRange()[emotions[0].id];
  }
}

export async function buildDroid(pranCanvas: Container, speechBubble: SpeechBubble): Promise<PranDroid> {
  return PranDroidBuilder.create(pranCanvas, speechBubble)
    .useApiEmotions()
    .useApiImages()
    .build();
}
