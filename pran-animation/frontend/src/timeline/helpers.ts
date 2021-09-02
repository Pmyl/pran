import { ActionType, ClearAction, DrawAction, NoneAction } from './timeline-action';

export const draw = (image: HTMLImageElement): DrawAction => ({ type: ActionType.Draw, image });
export const clear = (): ClearAction => ({ type: ActionType.Clear });
export const wait = (amount: number): NoneAction => ({ type: ActionType.None, amount });