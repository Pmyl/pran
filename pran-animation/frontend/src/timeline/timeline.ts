import { CanvasController } from 'pran-phonemes-frontend';
import { ActionType, TimelineAction } from './timeline-action';

export class Timeline {
  public readonly timelineActions: readonly TimelineAction[];
  public get frames(): number {
    return this.timelineActions.reduce((acc, action) => {
      return acc + (action.type === ActionType.None ? action.amount : 1);
    }, 0);
  }

  private _currentWait: number;
  private _timelineActionsQueue: TimelineAction[];
  private _layer: CanvasController;

  constructor(layer: CanvasController, animation: TimelineAction[]) {
    this.timelineActions = animation;
    this._timelineActionsQueue = animation.slice();
    this._layer = layer;
  }

  public restart(): void {
    this._timelineActionsQueue = this.timelineActions.slice();
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
      this._executeNextAction();
    }
  }

  private _executeNextAction(): void {
    const action = this._timelineActionsQueue.shift();
    switch (action.type) {
      case ActionType.Clear:
        this._layer.dry_clear();
        break;
      case ActionType.Draw:
        this._layer.dry_replace(action.image);
        break;
      case ActionType.None:
        this._currentWait = action.amount - 1;
        break;
    }
  }

  // This doesn't really work, it has to be fixes so it can be used as "skip" on the timeline
  private _executeActionAfter(amount: number) {
    while (amount > 0) {
      const action = this._timelineActionsQueue.shift();
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
            this._currentWait = action.amount - amount;
            amount = 0;
          }
          break;
      }
    }
  }
}