import { ActionType, Animator, NoneAction, Timeline, TimelineAction } from 'pran-animation-frontend';
import { combine, EditorAction, invert } from '../../memento/editor-actions-memento';
import { TimelineBar } from '../timeline-bar/timeline-bar';
import { Block, ClearBlock } from '../timeline-block/timeline-block';

export function reduceBlock(animator: Animator, timeline: Timeline, block: Block): EditorAction {
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

export function expandBlock(animator: Animator, timeline: Timeline, block: Block, timelineBar: TimelineBar) {
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
    insertBlock(animator, timeline,
      ClearBlock.Builder()
        .addAction({ type: ActionType.Clear })
        .addAction({ type: ActionType.None, amount: block.noneAmount })
        .build(), frame)
  );
}
