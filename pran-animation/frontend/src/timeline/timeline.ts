import { CanvasController } from '../canvas-controller/canvas-controller';
import { ActionType, TimelineAction } from './timeline-action';

export class Timeline {
  public get parentId(): string {
    return this._parentId;
  }
  public get timelineActions(): readonly TimelineAction[] {
    return this._timelineActions;
  }
  public get frames(): number {
    return this._totalFrames;
  }
  public get layer(): CanvasController {
    return this._layer;
  }
  public get isLoop(): boolean {
    return this._isLoop;
  }
  public get id(): string {
    return this._id;
  }

  private readonly _id: string;
  private readonly _timelineActions: TimelineAction[];
  private readonly _layer: CanvasController;
  private _parentId: string;
  private _currentWait: number;
  private _currentTranslationFrame: number = 0;
  private _targetFrame: number = 0;
  private _totalFrames: number = 0;
  private _currentActionIndex: number = 0;
  private _isLoop: boolean;
  private _translations: Map<number, [number, number]>;
  private _magnetTranslation: { x: number; y: number } = { x: 0, y: 0};
  private _lastTranslationsFrame: number;

  constructor(name: string, layer: CanvasController, animation: TimelineAction[]) {
    this._id = name;
    this._timelineActions = animation;
    this._layer = layer;
    this._translations = new Map();
    this._recalculateTimelineData();
  }

  public activateLoop(): void {
    this._isLoop = true;
  }

  public setTranslations(translations: Map<number, [number, number]>) {
    this._translations = translations;
    this._recalculateTimelineData();
  }

  public setParentId(parentId: string) {
    this._parentId = parentId;
  }

  public restart(): void {
    this._targetFrame = 0;
    this._layer.dryMoveTo(-this._magnetTranslation.x, -this._magnetTranslation.y);
    this._refreshTimeline();
  }

  public tick(amount: number): void {
    this._targetFrame += amount;

    this._tickFrames(amount);

    if (this._currentWait > 0) {
      this._currentWait -= amount;

      if (this._currentWait < 0) {
        this._executeActionAfter(this._currentWait * -1);
        this._currentWait = 0;
      }
    } else {
      this._executeActionAfter(amount);
    }
  }

  public startFrom(ancestorTimeline: Timeline) {
    const ancestorTranslation = ancestorTimeline.layer.getTranslation();
    this._magnetTranslation = { x: -ancestorTranslation.x, y: -ancestorTranslation.y };
    this.layer.dryMove(ancestorTranslation.x, ancestorTranslation.y);
  }

  public updateAction(action: TimelineAction, newActions: TimelineAction[]): void {
    const actionIndex = this._timelineActions.indexOf(action);
    this._timelineActions.splice(actionIndex, Math.max(newActions.length, 1), ...newActions);
    this._recalculateTimelineData();
  }

  public insertTimelineAction(frame: number, action: TimelineAction) {
    const actions = this._timelineActions.slice();
    let amount = frame,
      insertAfterCount = 0;

    while (amount > 0 && actions.length) {
      const action = actions.shift();
      insertAfterCount++;
      switch (action.type) {
        case ActionType.Clear:
          amount--;
          break;
        case ActionType.Draw:
          amount--;
          break;
        case ActionType.None:
          if (amount >= action.amount) {
            amount -= action.amount;
          } else {
            throw new Error(`Cannot insert action in timeline at frame ${frame} because there is already an action at that frame`);
          }
          break;
      }
    }

    this._timelineActions.splice(insertAfterCount, 0, action);
    this._recalculateTimelineData();
  }

  public removeTimelineAction(action: TimelineAction) {
    const actionIndex = this._timelineActions.indexOf(action);
    this._timelineActions.splice(actionIndex, 1);
    this._recalculateTimelineData();
  }

  public expandTimelineAction(amount: number, action: TimelineAction) {
    if (action.type === ActionType.None) {
      action.amount += amount;
    } else {
      throw new Error('Only None actions can be expanded');
    }
    this._recalculateTimelineData();
  }

  public reduceTimelineAction(amount: number, action: TimelineAction) {
    if (action.type === ActionType.None) {
      if (action.amount - amount <= 0) {
        throw new Error('Actions cannot be reduced to be less than one frame, remove them instead');
      } else {
        action.amount -= amount;
      }
    } else {
      throw new Error('Only None actions can be reduced');
    }
    this._recalculateTimelineData();
  }

  public replaceTimelineAction<T extends TimelineAction>(actionToReplace: T, replacement: T): void {
    if (actionToReplace.type !== replacement.type) {
      throw new Error('Actions can be replaced only with an action of the same type');
    }

    this.insertTimelineAction(this.getActionInitialFrame(actionToReplace), replacement);
    this.removeTimelineAction(actionToReplace);
    this._recalculateTimelineData();
  }

  public getActionInitialFrame(action: TimelineAction): number | undefined {
    const actions = this._timelineActions.slice();
    let amount = 0;

    while (actions.length) {
      const currentAction = actions.shift();
      if (currentAction === action) {
        return amount;
      }

      switch (currentAction.type) {
        case ActionType.Clear:
          amount++;
          break;
        case ActionType.Draw:
          amount++;
          break;
        case ActionType.None:
          amount += currentAction.amount;
          break;
      }
    }
  }

  public clone(): (canvasLayer: CanvasController) => Timeline {
    return (canvasLayer: CanvasController) => new Timeline(this._id, canvasLayer, this._timelineActions.slice());
  }

  private _executeActionAfter(amount: number) {
    while (amount > 0) {
      if (this._currentActionIndex >= this._timelineActions.length) {
        if (this._isLoop) {
          this._restartActions();
        } else {
          break;
        }
      }

      const action = this._timelineActions[this._currentActionIndex];
      switch (action.type) {
        case ActionType.Clear:
          this._layer.dryClear();
          amount--;
          break;
        case ActionType.Draw:
          this._layer.dryReplace(action.image);
          amount--;
          break;
        case ActionType.None:
          if (amount > action.amount) {
            amount -= action.amount;
          } else {
            this._currentWait = action.amount - amount;
            amount = 0;
          }
          break;
      }

      this._currentActionIndex++;
    }
  }

  private _tickOneFrame() {
    let magnetForceX = 0, magnetForceY = 0;
    if (this._magnetTranslation.x !== 0) {
      magnetForceX = this._magnetTranslation.x > 0 ? 1 : -1;
    }
    if (this._magnetTranslation.y !== 0) {
      magnetForceY = this._magnetTranslation.y > 0 ? 1 : -1;
    }
    this._magnetTranslation.x -= magnetForceX;
    this._magnetTranslation.y -= magnetForceY;
    this._layer.dryMove(
      magnetForceX,
      magnetForceY
    );

    if (this._currentTranslationFrame > this._lastTranslationsFrame) {
      if (this._isLoop) {
        this._restartTranslations();
      } else {
        return;
      }
    }

    if (this._translations.has(this._currentTranslationFrame)) {
      this._layer.dryMove(
        this._translations.get(this._currentTranslationFrame)[0],
        this._translations.get(this._currentTranslationFrame)[1]
      );
    }
    this._currentTranslationFrame++;
  }

  private _tickFrames(amount: number) {
    for (let i = 0; i < amount; i++) {
      this._tickOneFrame();
    }
  }

  private _restartActions(): void {
    this._currentActionIndex = 0;
    this._currentWait = 0;
  }

  private _restartTranslations(): void {
    this._currentTranslationFrame = 0;
  }

  private _restart(): void {
    this._currentTranslationFrame = 0;
    this._currentActionIndex = 0;
    this._currentWait = 0;
  }

  private _refreshTimeline() {
    this._restart();
    this._executeActionAfter(this._targetFrame);
  }

  private _recalculateTimelineData() {
    this._totalFrames = this.timelineActions.reduce((acc, action) => {
      return acc + (action.type === ActionType.None ? action.amount : 1);
    }, 0);

    this._lastTranslationsFrame = 0;
    const translationFrames = this._translations.keys();
    let frame = translationFrames.next();
    while (!frame.done) {
      this._lastTranslationsFrame = Math.max(frame.value + 1, this._lastTranslationsFrame);
      frame = translationFrames.next();
    }

    this._totalFrames = Math.max(this._lastTranslationsFrame, this._totalFrames);
    this._targetFrame = Math.min(this._totalFrames, this._targetFrame);
    this._refreshTimeline();
  }
}