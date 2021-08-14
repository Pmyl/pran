import { CanvasController } from 'pran-phonemes-frontend';
import { ActionType, TimelineAction } from './pran-animation';

export class Timeline {
  private _currentWait: number;
  private _timelineActions: TimelineAction[];
  private _timelineActionsQueue: TimelineAction[];
  private _layer: CanvasController;

  constructor(layer: CanvasController, animation: TimelineAction[]) {
    this._layer = layer;
    this._timelineActions = animation;
    this._timelineActionsQueue = animation.slice();
  }

  public restart(): void {
    this._timelineActionsQueue = this._timelineActions.slice();
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
        this._layer.clear();
        break;
      case ActionType.Draw:
        this._layer.clear();
        this._layer.draw(action.image);
        break;
      case ActionType.None:
        this._currentWait = action.amount;
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