import { ActionType, Animator, Timeline, TimelineAction } from 'pran-animation-frontend';
import { BlockWithActions } from '../../block/block';
import { EditorAction } from '../editor-queue';

export function insertBlock(animator: Animator, timeline: Timeline, block: BlockWithActions, frame: number): EditorAction {
  const actionsAdded: TimelineAction[] = block.actions.slice();

  return {
    name: 'Insert block',
    do() {
      let frameToInsertAction: number = frame;

      actionsAdded.forEach(a => {
        animator.insertTimelineAction(timeline, frameToInsertAction, a);
        frameToInsertAction += a.type === ActionType.None ? a.amount : 1;
      });
    },
    undo() {
      actionsAdded.forEach(a => {
        animator.removeTimelineAction(timeline, a);
      });
    }
  };
}