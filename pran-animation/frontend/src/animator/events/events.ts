import { TimelineAction } from '../../timeline/timeline-action';

export enum TimelineChangeType {
  Add,
  Remove,
  Swap,
  InsertAction,
  RemoveAction,
  ExpandAction,
  ReduceAction,
  ReplaceSameType,
}

export type TimelineChange = 
  TimelineAdd |
  TimelineRemove |
  TimelineInsertAction |
  TimelineRemoveAction |
  TimelineExpandAction |
  TimelineReduceAction |
  TimelineReplaceActionSameType;

export interface TimelineInsertAction {
  type: TimelineChangeType.InsertAction;
  frame: number;
  action: TimelineAction;
}

export interface TimelineExpandAction {
  type: TimelineChangeType.ExpandAction;
  amount: number;
  action: TimelineAction;
}

export interface TimelineReduceAction {
  type: TimelineChangeType.ReduceAction;
  amount: number;
  action: TimelineAction;
}

export interface TimelineRemoveAction {
  type: TimelineChangeType.RemoveAction;
  action: TimelineAction;
}

export interface TimelineReplaceActionSameType {
  type: TimelineChangeType.ReplaceSameType;
  actionToReplace: TimelineAction;
  replacement: TimelineAction;
}

export interface TimelineAdd {
  type: TimelineChangeType.Add;
  index: number;
}

export interface TimelineRemove {
  type: TimelineChangeType.Remove;
  index: number;
}

export interface TimelineSwap {
  type: TimelineChangeType.Swap;
  index1: number;
  index2: number;
}