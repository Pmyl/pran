import { ActionType, Animator, DrawAction, Timeline } from 'pran-animation-frontend';
import { Block, BlocksFilter, BlockType, ClearBlock, ImageBlock } from '../../block/block';
import { TimelineBar } from '../../timeline/timeline-bar';
import { combine, EditorAction, noop } from '../editor-queue';
import { expandBlock } from './expand-block';
import { insertBlock } from './insert-block';
import { reduceBlock } from './reduce-block';

export function splitBlock(animator: Animator, timeline: Timeline, timelineBar: TimelineBar, block: Block, frame: number): EditorAction {
  if (!BlocksFilter.isWithActions(block)) {
    console.warn('Cannot split a block with no actions');
    return noop('Split block (Invalid)');
  }

  const blockInitialFrame = timelineBar.findBlockInitialFrame(block);

  if (frame < blockInitialFrame) {
    return noop('Split block before start (Invalid)');
  }

  if (block.visualFrames + blockInitialFrame < frame) {
    return noop('Split block after end (Invalid)');
  }

  const rightBlockPartFrames: number = Math.max(1, blockInitialFrame + block.frames - frame);

  let blockRightPartBuilder: ReturnType<typeof ImageBlock.Builder | typeof ClearBlock.Builder>;

  if (block.type === BlockType.Image) {
    blockRightPartBuilder = ImageBlock.Builder()
      .addAction({ type: ActionType.Draw, image: (block.actions[0] as DrawAction).image, metadata: block.actions[0].metadata });
  } else {
    blockRightPartBuilder = ClearBlock.Builder();
  }

  const actions: EditorAction[] = [insertBlock(animator, timeline, blockRightPartBuilder
    .addAction({ type: ActionType.None, amount: rightBlockPartFrames - 1 })
    .build(), blockInitialFrame + block.frames)];

  if (block.frames + blockInitialFrame < frame) {
    actions.push(expandBlock(animator, timeline, block, timelineBar, frame - block.frames - blockInitialFrame));
  } else {
    actions.push(reduceBlock(animator, timeline, block, rightBlockPartFrames));
  }

  return combine(
    'Split block',
    ...actions
  );
}