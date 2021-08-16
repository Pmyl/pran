import { CanvasController } from 'pran-phonemes-frontend';
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

  private _currentWait: number;
  private _timelineActionsQueue: TimelineAction[];
  private _timelineActions: TimelineAction[];
  private _layer: CanvasController;

  constructor(layer: CanvasController, animation: TimelineAction[]) {
    this._timelineActions = animation;
    this._timelineActionsQueue = animation.slice();
    this._layer = layer;
  }

  public restart(): void {
    this._timelineActionsQueue = this._timelineActions.slice();
    this._currentWait = 0;
  }

  public tick(amount: number): void {
    if (this._timelineActionsQueue.length === 0) {
      return;
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
          if (amount > action.amount) {
            amount -= action.amount;
          } else {
            throw new Error(`Cannot insert action in timeline at frame ${frame} because there is already an action at that frame`);
          }
          break;
      }
    }
    
    this._timelineActions.splice(insertAfterCount, 0, action);
  }

  private _executeActionAfter(amount: number) {
    while (amount > 0 && this._timelineActionsQueue.length) {
      const action = this._timelineActionsQueue.shift();
      switch (action.type) {
        case ActionType.Clear:
          this._layer.dry_clear();
          amount--;
          break;
        case ActionType.Draw:
          this._layer.dry_replace(action.image);
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
    }
  }

  removeTimelineAction(action: TimelineAction) {
    const actionIndex = this._timelineActions.indexOf(action);
    this._timelineActions.splice(actionIndex, 1);
  }

  expandTimelineAction(amount: number, action: TimelineAction) {
    if (action.type === ActionType.None) {
      action.amount += amount;
    } else {
      throw new Error('Only None actions can be expanded');
    }
  }

  reduceTimelineAction(amount: number, action: TimelineAction) {
    if (action.type === ActionType.None) {
      if (action.amount - amount <= 0) {
        throw new Error('Actions cannot be reduced to be less than one frame, remove them instead');
      } else {
        action.amount -= amount;
      }
    } else {
      throw new Error('Only None actions can be reduced');
    }
  }
}