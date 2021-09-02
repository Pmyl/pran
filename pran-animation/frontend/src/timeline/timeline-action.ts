export type TimelineAction = NoneAction | DrawAction | ClearAction;

export const enum ActionType {
  None,
  Draw,
  Clear
}

export interface NoneAction {
  type: ActionType.None;
  amount: number;
  metadata?: { [key: string]: any };
}

export interface DrawAction {
  type: ActionType.Draw;
  image: HTMLImageElement;
  metadata?: { [key: string]: any };
}

export interface ClearAction {
  type: ActionType.Clear;
  metadata?: { [key: string]: any };
}
