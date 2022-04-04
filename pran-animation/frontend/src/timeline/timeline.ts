import { CanvasController } from '../canvas-controller/canvas-controller';
import { ActionType, TimelineAction } from './timeline-action';

export class Timeline {
  public get timelineActions(): readonly TimelineAction[] {
    return this._timelineActions;
  }
  public get frames(): number {
    return this.timelineActions.reduce((acc, action) => {
      return acc + (action.type === ActionType.None ? action.amount : 1);
    }, 0);
  }
  public get layer(): CanvasController {
    return this._layer;
  }
  public get isLoop(): boolean {
    return this._isLoop;
  }

  private _currentWait: number;
  private _timelineActions: TimelineAction[];
  private _layer: CanvasController;
  private _currentFrame: number = 0;
  private _currentActionIndex: number = 0;
  private _isLoop: boolean;

  constructor(layer: CanvasController, animation: TimelineAction[]) {
    this._timelineActions = animation;
    this._layer = layer;
  }

  public activateLoop(): void {
    this._isLoop = true;
  }

  public restart(): void {
    this._currentFrame = 0;
    this._refreshTimelineActionsQueue();
  }

  public tick(amount: number): void {
    this._currentFrame += amount;

    if (this._currentActionIndex === this._timelineActions.length) {
      if (this._isLoop) {
        this.restart();
      } else {
        return;
      }
    }

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

  public updateAction(action: TimelineAction, newActions: TimelineAction[]): void {
    const actionIndex = this._timelineActions.indexOf(action);
    this._timelineActions.splice(actionIndex, Math.max(newActions.length, 1), ...newActions);
    this._refreshTimelineActionsQueue();
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
    this._refreshTimelineActionsQueue();
  }

  public removeTimelineAction(action: TimelineAction) {
    const actionIndex = this._timelineActions.indexOf(action);
    this._timelineActions.splice(actionIndex, 1);
    this._refreshTimelineActionsQueue();
  }

  public expandTimelineAction(amount: number, action: TimelineAction) {
    if (action.type === ActionType.None) {
      action.amount += amount;
    } else {
      throw new Error('Only None actions can be expanded');
    }
    this._refreshTimelineActionsQueue();
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
    this._refreshTimelineActionsQueue();
  }

  public replaceTimelineAction<T extends TimelineAction>(actionToReplace: T, replacement: T): void {
    if (actionToReplace.type !== replacement.type) {
      throw new Error('Actions can be replaced only with an action of the same type');
    }

    this.insertTimelineAction(this.getActionInitialFrame(actionToReplace), replacement);
    this.removeTimelineAction(actionToReplace);
    this._refreshTimelineActionsQueue();
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

  private _executeActionAfter(amount: number) {
    while (amount > 0) {
      if (this._currentActionIndex === this._timelineActions.length) {
        if (this._isLoop) {
          this.restart();
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

  private _refreshTimelineActionsQueue() {
    this._currentActionIndex = 0;
    this._currentWait = 0;
    this._executeActionAfter(this._currentFrame);
  }
}