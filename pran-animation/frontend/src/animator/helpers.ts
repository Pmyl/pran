import { ActionType } from '../timeline/timeline-action';
import { ManagerTimelineDrawAction } from './animator-manager';

export const drawId = (id: string): ManagerTimelineDrawAction => ({ type: ActionType.Draw, imageId: id });
