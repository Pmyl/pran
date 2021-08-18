import { ActionType, Animator, DrawAction, NoneAction, Timeline, TimelineAction } from 'pran-animation-frontend';
import { combine, EditorAction, invert, noop } from '../../memento/editor-actions-memento';
import { TimelineBar } from '../timeline-bar/timeline-bar';
import { Block, BlockType, ClearBlock, ImageBlock } from '../timeline-block/timeline-block';

export function reduceBlock(animator: Animator, timeline: Timeline, block: Block, amount: number = 1): EditorAction {
  if (block.frames <= amount) {
    console.warn('Tried to reduce block', block, 'to disappear, something went wrong.')
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
  if (amount > 1) {
    return combine(`Expand block of ${amount}`, ...Array(amount).fill(undefined).map(() => expandBlock(animator, timeline, block, timelineBar)));
  }

  let actionExpanded: NoneAction;

  return {
    name: 'Expand block',
    do() {
      const lastAction: TimelineAction = block.actions[block.actions.length - 1];

      if (lastAction.type === ActionType.None) {
        actionExpanded = lastAction;
        animator.expandTimelineAction(timeline, 1, lastAction);
      } else {
        actionExpanded = { type: ActionType.None, amount: 1 };
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

export function expandBlockLeft(animator: Animator, timeline: Timeline, block: Block, timelineBar: TimelineBar) {
  const prevBlock = timelineBar.blocks[timelineBar.blocks.indexOf(block) - 1];

  if (prevBlock) {
    return combine('Expand block left', expandBlock(animator, timeline, block, timelineBar), reduceBlock(animator, timeline, prevBlock));
  }

  return expandBlock(animator, timeline, block, timelineBar);
}

export function reduceBlockLeft(animator: Animator, timeline: Timeline, block: Block, timelineBar: TimelineBar): EditorAction {
  const prevBlock = timelineBar.blocks[timelineBar.blocks.indexOf(block) - 1];

  if (prevBlock) {
    return combine('Reduce block left', reduceBlock(animator, timeline, block), expandBlock(animator, timeline, prevBlock, timelineBar));
  }

  return reduceBlock(animator, timeline, block);
}

export function insertBlock(animator, timeline, block, frame): EditorAction {
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
  }
}

export function removeBlock(animator: Animator, timeline: Timeline, block: Block): EditorAction {
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
      .addAction({ type: ActionType.None, amount: block.noneAmount }).build(), frame)
  );
}

export function splitBlock(animator: Animator, timeline: Timeline, block: Block, timelineBar: TimelineBar, frame: number): EditorAction {
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
    adjustLeftBlockPart,
    insertBlock(animator, timeline, blockRightPartBuilder
      .addAction({ type: ActionType.None, amount: rightBlockPartFrames - 1 })
      .build(), frame)
  );
}
