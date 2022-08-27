import { MainCanvasController } from '../canvas-controller/main-canvas-controller';
import { Animator } from './animator';
import { ActionType, ClearAction, NoneAction, TimelineAction } from '../timeline/timeline-action';

export type ManagerTimelineAction = NoneAction | ManagerTimelineDrawAction | ClearAction;

export interface ManagerTimelineDrawAction {
  type: ActionType.Draw;
  imageId: string;
  metadata?: { [key: string]: any };
}

export interface ManagerTimelineComplex {
  id?: string | undefined;
  parentId?: string | undefined;
  actions: ManagerTimelineAction[];
  translations?: [number, [number, number]][] | undefined;
  loop: boolean;
}

export type ManagerTimelineConfig = ManagerTimelineAction[] | ManagerTimelineComplex;

export class AnimatorManager {
  public get imagesMap(): ReadonlyMap<string, HTMLImageElement> {
    return this._imagesMap;
  };
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

  public animate(animator: Animator, ...animations: ManagerTimelineConfig[]): Animator;
  public animate(...animations: ManagerTimelineAction[][]): Animator;
  public animate(maybeAnimator: Animator | ManagerTimelineAction[], ...animations: ManagerTimelineConfig[]): Animator {
    if (maybeAnimator instanceof Animator) {
      return this._replaceAnimation(maybeAnimator, ...animations);
    }

    const animator = new Animator(this._canvasController);
    const allAnimations = maybeAnimator ? [maybeAnimator, ...animations] : [];
    for (let i = 0; i < allAnimations.length; i++) {
      animator.addTimeline(this._toTimelineConfig(allAnimations[i]));
    }

    return animator;
  }

  public cloneInNewCanvas(canvasController: MainCanvasController): AnimatorManager {
    return new AnimatorManager(canvasController, this._imagesMap);
  }

  public copyAnimatorFrom(animator: Animator): Animator {
    const animatorCopy = new Animator(this._canvasController);
    animator.timelines.forEach(t => {
      animatorCopy.addTimeline(t.clone());
    });

    return animatorCopy;
  }

  private _replaceAnimation(animator: Animator, ...animations: ManagerTimelineConfig[]): Animator {
    animator.replaceTimelines(animations.map(animation => this._toTimelineConfig(animation)));
    return animator;
  }

  private _toTimelineConfig(animation: ManagerTimelineComplex | ManagerTimelineAction[]) {
    if (Array.isArray(animation)) {
      return { actions: this._toAnimationDetails(animation), loop: false };
    } else {
      return { actions: this._toAnimationDetails(animation.actions), loop: animation.loop, id: animation.id, parentId: animation.parentId, translations: new Map(animation.translations) };
    }
  }

  private static async _loadAllImages(imagesPath: [id: string, url: string][]): Promise<Map<string, HTMLImageElement>> {
    let imagesWithPath = await Promise.all<[string, HTMLImageElement]>(imagesPath.map(imagePath => new Promise<[string, HTMLImageElement]>(r => {
      const image = new Image();
      image.src = imagePath[1];
      image.onload = () => r([imagePath[0], image]);
      image.onerror = () => {
        console.error('Image not found, wrong configuration')
        r([imagePath[0], image]);
      };
    })));

    const map: Map<string, HTMLImageElement> = new Map<string, HTMLImageElement>();

    for (let i = 0; i < imagesWithPath.length; i++) {
      map.set(imagesWithPath[i][0], imagesWithPath[i][1]);
    }

    return map;
  }

  private _toAnimationDetails(animation: ManagerTimelineAction[]): TimelineAction[] {
    return animation.map(x => x.type === ActionType.Draw ? { type: ActionType.Draw, image: this._getImage(x.imageId), metadata: x.metadata } : x);
  }

  private _getImage(imageId: string): HTMLImageElement {
    if (this._imagesMap.has(imageId)) {
      return this._imagesMap.get(imageId);
    }

    const fallbackId: string = this._imagesMap.keys().next().value;
    console.warn('Tried to draw image with id >', imageId, '< but this id is not configured. (Fallback to >', fallbackId, '<)');
    return this._imagesMap.get(fallbackId);
  }
}
