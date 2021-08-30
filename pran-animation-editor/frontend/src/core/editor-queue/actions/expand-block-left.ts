import { Animator, Timeline } from 'pran-animation-frontend';
import { Block, BlocksFilter } from '../../block/block';
import { TimelineBar } from '../../timeline/timeline-bar';
import { combine, noop } from '../editor-queue';
import { expandBlock } from './expand-block';
import { reduceBlock } from './reduce-block';

export function expandBlockLeft(animator: Animator, timeline: Timeline, block: Block, timelineBar: TimelineBar, amount: number = 1) {
  if (BlocksFilter.isNothingness(block)) {
    console.warn('Cannot resize a nothingness block');
    return noop('Expand block left (Invalid)');
  }

  if (amount > 1) {
    return combine(`Expand block left of ${amount}`, ...Array(amount).fill(undefined).map(() => expandBlockLeft(animator, timeline, block, timelineBar)));
  }

  const prevBlock = timelineBar.blocks[timelineBar.blocks.indexOf(block) - 1];

  if (!prevBlock) {
    console.warn('Tried to expand block left', prevBlock, 'before the start of the timeline, something went wrong.');
    return noop('Expand block left (Invalid)');
  }

  if (prevBlock.visualFrames <= amount) {
    console.warn('Tried to reduce block', prevBlock, 'to disappear, something went wrong.');
    return noop('Expand block left (Invalid)');
  }

  return combine('Expand block left', expandBlock(animator, timeline, block, timelineBar, amount), reduceBlock(animator, timeline, prevBlock, amount));
}