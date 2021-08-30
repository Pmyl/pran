import { ActionType, Animator, Timeline } from 'pran-animation-frontend';
import { Block, ClearBlock } from '../../block/block';
import { TimelineBar } from '../../timeline/timeline-bar';
import { combine, EditorAction } from '../editor-queue';
import { insertBlock } from './insert-block';
import { removeBlock } from './remove-block';

export function clearBlock(animator: Animator, timeline: Timeline, block: Block, timelineBar: TimelineBar): EditorAction {
  const frame = timelineBar.findBlockInitialFrame(block);

  return combine(
    'Clear block',
    removeBlock(animator, timeline, block),
    insertBlock(animator, timeline, ClearBlock.Builder()
      .addAction({ type: ActionType.Clear })
      .addAction({ type: ActionType.None, amount: block.visualFrames - 1 }).build(), frame)
  );
}
