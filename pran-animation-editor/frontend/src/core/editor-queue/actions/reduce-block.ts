import { ActionType, Animator, Timeline, TimelineAction } from 'pran-animation-frontend';
import { Block, BlocksFilter } from '../../block/block';
import { combine, EditorAction, noop } from '../editor-queue';

export function reduceBlock(animator: Animator, timeline: Timeline, block: Block, amount: number = 1): EditorAction {
  if (BlocksFilter.isNothingness(block)) {
    console.warn('Cannot resize a nothingness block');
    return noop('Reduce block (Invalid)');
  }

  if (block.frames <= amount) {
    console.warn('Tried to reduce block', block, 'to disappear, something went wrong.');
    return noop('Reduce block (Invalid)');
  }

  if (amount > 1) {
    return combine(`Reduce block of ${amount}`, ...Array(amount).fill(undefined).map(() => reduceBlock(animator, timeline, block)));
  }

  let lastAction: TimelineAction = block.actions[block.actions.length - 1],
    wasReduced: boolean,
    actionInitialFrame: number;

  return {
    name: 'Reduce block',
    do() {
      if (lastAction.type === ActionType.None && lastAction.amount > 1) {
        wasReduced = true;
        animator.reduceTimelineAction(timeline, 1, lastAction);
      } else {
        wasReduced = false;
        actionInitialFrame = timeline.getActionInitialFrame(lastAction);
        animator.removeTimelineAction(timeline, lastAction);
      }
    },
    undo() {
      if (lastAction.type === ActionType.None && wasReduced) {
        animator.expandTimelineAction(timeline, 1, lastAction);
      } else {
        animator.insertTimelineAction(timeline, actionInitialFrame, lastAction);
      }
    }
  };
}