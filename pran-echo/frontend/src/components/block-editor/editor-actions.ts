import { ActionType, Animator, DrawAction, NoneAction, Timeline, TimelineAction } from 'pran-animation-frontend';
import { combine, EditorAction, invert, lazy, noop } from '../../editor-queue/editor-queue';
import { TimelineBar } from '../../services/timeline-bar';
import {
  Block,
  BlocksFilter,
  BlockType,
  BlockWithActions,
  ClearBlock,
  ImageBlock
} from '../../services/timeline-block';

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

export function forceInsertBlock(animator: Animator, timeline: Timeline, block: BlockWithActions, timelineBar: TimelineBar, frame: number): EditorAction {
  return combine(
    'Insert block',
    splitInTimeline(animator, timeline, timelineBar, frame),
    insertBlock(animator, timeline, block, frame)
  );
}

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

export function removeBlock(animator: Animator, timeline: Timeline, block: Block): EditorAction {
  if (BlocksFilter.isNothingness(block)) {
    console.warn('Cannot remove a nothingness block, it\'s already nothing');
    return noop('Remove block (Invalid)');
  }

  const blockInitialFrame: number = timeline.getActionInitialFrame(block.actions[0]);
  return invert('Remove block', insertBlock(animator, timeline, block, blockInitialFrame));
}

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

export function updateImage(animator: Animator, timeline: Timeline, block: Block, image: HTMLImageElement): EditorAction {
  if (!BlocksFilter.isImage(block)) {
    console.warn('Cannot update image of a non image block');
    return noop('Update image (Invalid)');
  }

  const actionToReplace = block.actions[0],
    replacement: TimelineAction = { type: ActionType.Draw, image: image };
    
  return {
    name: 'Update image',
    do() {
      animator.replaceTimelineAction(timeline, actionToReplace, replacement);
    },
    undo() {
      animator.replaceTimelineAction(timeline, replacement, actionToReplace);
    }
  };
}

export function splitInTimeline(animator: Animator, timeline: Timeline, timelineBar: TimelineBar, frame: number): EditorAction {
  const block = timelineBar.findBlockAtFrame(frame);
  
  if (!block) {
    console.warn('Cannot split where there is no block');
    return noop('Split block (Invalid)');
  }

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

  let adjustLeftBlockPart: EditorAction;

  if (block.frames + blockInitialFrame < frame) {
    adjustLeftBlockPart = expandBlock(animator, timeline, block, timelineBar, frame - block.frames - blockInitialFrame);
  } else {
    adjustLeftBlockPart = reduceBlock(animator, timeline, block, rightBlockPartFrames);
  }

  let blockRightPartBuilder: ReturnType<typeof ImageBlock.Builder | typeof ClearBlock.Builder>;
  
  if (block.type === BlockType.Image) {
    blockRightPartBuilder = ImageBlock.Builder()
      .addAction({ type: ActionType.Draw, image: (block.actions[0] as DrawAction).image });
  } else {
    blockRightPartBuilder = ClearBlock.Builder();
  }

  return combine(
    'Split block',
    insertBlock(animator, timeline, blockRightPartBuilder
      .addAction({ type: ActionType.None, amount: rightBlockPartFrames - 1 })
      .build(), blockInitialFrame + block.frames),
    adjustLeftBlockPart
  );
}

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