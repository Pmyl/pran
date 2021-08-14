export type TimelineAction = NoneAction | DrawAction | ClearAction;

export const enum ActionType {
  None,
  Draw,
  Clear
}

export interface NoneAction {
  type: ActionType.None;
  amount: number;
}

export interface DrawAction {
  type: ActionType.Draw;
  image: HTMLImageElement;
}

export interface ClearAction {
  type: ActionType.Clear;
}