import { Animator, Timeline } from 'pran-animation-frontend';
import { EditorAction } from '../editor-queue';

export function addTimeline(animator: Animator): EditorAction {
  let addedTimeline: Timeline;

  return {
    name: 'Add timeline',
    do() {
      addedTimeline = animator.addTimeline([]);
    },
    undo() {
      animator.removeTimeline(addedTimeline);
    }
  }
}