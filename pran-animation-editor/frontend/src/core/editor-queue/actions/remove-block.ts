import { Animator, Timeline } from 'pran-animation-frontend';
import { Block, BlocksFilter } from '../../block/block';
import { EditorAction, invert, noop } from '../editor-queue';
import { insertBlock } from './insert-block';

export function removeBlock(animator: Animator, timeline: Timeline, block: Block): EditorAction {
  if (BlocksFilter.isNothingness(block)) {
    console.warn('Cannot remove a nothingness block, it\'s already nothing');
    return noop('Remove block (Invalid)');
  }

  const blockInitialFrame: number = timeline.getActionInitialFrame(block.actions[0]);
  return invert('Remove block', insertBlock(animator, timeline, block, blockInitialFrame));
}