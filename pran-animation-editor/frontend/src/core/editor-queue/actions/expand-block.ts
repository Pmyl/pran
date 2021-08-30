import { ActionType, Animator, NoneAction, Timeline, TimelineAction } from 'pran-animation-frontend';
import { Block, BlocksFilter } from '../../block/block';
import { TimelineBar } from '../../timeline/timeline-bar';
import { combine, noop } from '../editor-queue';

export function expandBlock(animator: Animator, timeline: Timeline, block: Block, timelineBar: TimelineBar, amount: number = 1) {
  if (BlocksFilter.isNothingness(block)) {
    console.warn('Cannot resize a nothingness block');
    return noop('Expand block (Invalid)');
  }

  if (amount > 1) {
    return combine(`Expand block of ${amount}`, ...Array(amount).fill(undefined).map(() => expandBlock(animator, timeline, block, timelineBar)));
  }

  let actionExpanded: NoneAction;

  return {
    name: 'Expand block',
    do() {
      const isLastBlock = timelineBar.blocks[timelineBar.blocks.length - 1] === block,
        lastAction: TimelineAction = block.actions[block.actions.length - 1],
        amount: number = isLastBlock ? 1 + block.virtualFrames : 1;

      if (lastAction.type === ActionType.None) {
        actionExpanded = lastAction;
        animator.expandTimelineAction(timeline, amount, lastAction);
      } else {
        actionExpanded = { type: ActionType.None, amount };
        animator.insertTimelineAction(timeline, timelineBar.findBlockInitialFrame(block) + block.frames, actionExpanded);
      }
    },
    undo() {
      if (actionExpanded.amount > 1) {
        animator.reduceTimelineAction(timeline, 1, actionExpanded);
      } else {
        animator.removeTimelineAction(timeline, actionExpanded);
      }
    }
  };
}