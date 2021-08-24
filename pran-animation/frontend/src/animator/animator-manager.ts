import { MainCanvasController } from 'pran-phonemes-frontend';
import { Animator } from './animator';
import { Timeline } from '../timeline/timeline';
import { ActionType, ClearAction, NoneAction, TimelineAction } from '../timeline/timeline-action';

export type ManagerTimelineAction = NoneAction | ManagerTimelineDrawAction | ClearAction;

export interface ManagerTimelineDrawAction {
  type: ActionType.Draw;
  imageId: string;
}

export class AnimatorManager {
  private _imagesMap: Map<string, HTMLImageElement>;
  private _canvasController: MainCanvasController;

  private constructor(canvasController: MainCanvasController, imagesMap: Map<string, HTMLImageElement>) {
    this._canvasController = canvasController;
    this._imagesMap = imagesMap;
  }
  
  public static async create(canvasController: MainCanvasController, imagesToLoad: [id: string, url: string][]): Promise<AnimatorManager> {
    const imagesMap: Map<string, HTMLImageElement> = await this._loadAllImages(imagesToLoad);
    return new AnimatorManager(canvasController, imagesMap);
  }

  public animate(animator: Animator, ...animations: ManagerTimelineAction[][]): Animator;
  public animate(...animations: ManagerTimelineAction[][]): Animator;
  public animate(maybeAnimator: Animator | ManagerTimelineAction[], ...animations: ManagerTimelineAction[][]): Animator {
    if (maybeAnimator instanceof Animator) {
      return this._replaceAnimation(maybeAnimator, ...animations);
    }

    const animator = new Animator(this._canvasController);
    const allAnimations = maybeAnimator ? [maybeAnimator, ...animations] : [];
    for (let i = 0; i < allAnimations.length; i++) {
      animator.addTimeline(this._toAnimationDetails(allAnimations[i]));
    }

    return animator;
  }

  private _replaceAnimation(animator: Animator, ...animations: ManagerTimelineAction[][]): Animator {
    animator.timelines.slice().forEach(t => {
      animator.removeTimeline(t);
    });

    for (let i = 0; i < animations.length; i++) {
      animator.addTimeline(this._toAnimationDetails(animations[i]));
    }
    
    return animator;
  }

  private static async _loadAllImages(imagesPath: [id: string, url: string][]): Promise<Map<string, HTMLImageElement>> {
    let imagesWithPath = await Promise.all<[string, HTMLImageElement]>(imagesPath.map(imagePath => new Promise(r => {
      const image = new Image();
      image.src = imagePath[1];
      image.onload = () => r([imagePath[0], image]);
    })));

    const map: Map<string, HTMLImageElement> = new Map<string, HTMLImageElement>();

    for (let i = 0; i < imagesWithPath.length; i++) {
      map.set(imagesWithPath[i][0], imagesWithPath[i][1]);
    }

    return map;
  }

  private _toAnimationDetails(animation: ManagerTimelineAction[]): TimelineAction[] {
    return animation.map(x => x.type === ActionType.Draw ? { type: ActionType.Draw, image: this._imagesMap.get(x.imageId) } : x);
  }
}
