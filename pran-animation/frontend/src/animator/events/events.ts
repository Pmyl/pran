import { TimelineAction } from '../../timeline/timeline-action';

export enum TimelineChangeType {
  Insert,
  Remove,
  Expand,
  Reduce,
}

export type TimelineChange = TimelineChangeInsert |
  TimelineChangeRemove |
  TimelineChangeExpand |
  TimelineChangeReduce;

export interface TimelineChangeInsert {
  type: TimelineChangeType.Insert;
  frame: number;
  action: TimelineAction;
}

export interface TimelineChangeExpand {
  type: TimelineChangeType.Expand;
  amount: number;
  action: TimelineAction;
}

export interface TimelineChangeReduce {
  type: TimelineChangeType.Reduce;
  amount: number;
  action: TimelineAction;
}

export interface TimelineChangeRemove {
  type: TimelineChangeType.Remove;
  action: TimelineAction;
}