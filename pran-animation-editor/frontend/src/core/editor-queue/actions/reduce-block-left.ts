import { Animator, Timeline } from 'pran-animation-frontend';
import { Block, BlocksFilter } from '../../block/block';
import { TimelineBar } from '../../timeline/timeline-bar';
import { combine, EditorAction, lazy, noop } from '../editor-queue';
import { expandBlock } from './expand-block';
import { reduceBlock } from './reduce-block';

export function reduceBlockLeft(animator: Animator, timeline: Timeline, block: Block, timelineBar: TimelineBar, amount: number = 1): EditorAction {
  if (BlocksFilter.isNothingness(block)) {
    console.warn('Cannot resize a nothingness block');
    return noop('Reduce block left (Invalid)');
  }

  if (block.visualFrames <= amount) {
    console.warn('Tried to reduce block', block, 'to disappear, something went wrong.');
    return noop('Reduce block left (Invalid)');
  }

  if (block === timelineBar.blocks[0]) {
    console.warn('Tried to reduce block left', block, 'but it\'s the first block.');
    return noop('Expand block left (Invalid)');
  }


  if (amount > 1) {
    return combine(`Reduce block left of ${amount}`, ...Array(amount).fill(undefined).map(() => reduceBlockLeft(animator, timeline, block, timelineBar)));
  }

  const isLastBlock = timelineBar.blocks[timelineBar.blocks.length - 1] === block,
    prevBlock = timelineBar.blocks[timelineBar.blocks.indexOf(block) - 1];
  let fillBlockVirtualFrames: EditorAction | undefined;

  if (isLastBlock && block.virtualFrames > 0) {
    fillBlockVirtualFrames = expandBlock(animator, timeline, block, timelineBar, block.virtualFrames);
  }

  if (prevBlock) {
    return combine(`Reduce block left of ${amount}`,
      fillBlockVirtualFrames,
      lazy(() => reduceBlock(animator, timeline, block, amount)),
      lazy(() => expandBlock(animator, timeline, prevBlock, timelineBar, amount))
    );
  }

  return combine(`Reduce block left of ${amount}`,
    fillBlockVirtualFrames,
    lazy(() => reduceBlock(animator, timeline, block, amount))
  );
}