import { Animator, Timeline } from 'pran-animation-frontend';
import { EditorAction } from '../editor-queue';

export function removeTimeline(animator: Animator, timeline: Timeline): EditorAction {
  let index: number;

  return {
    name: 'Remove timeline',
    do() {
      index = animator.removeTimeline(timeline);
    },
    undo() {
      timeline = animator.addTimelineAt(index, timeline.timelineActions.slice());
    }
  }
}