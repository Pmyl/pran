import { ActionType, Animator, Timeline, TimelineAction } from 'pran-animation-frontend';
import { inlineComponent } from '../../framework/inline-component';
import { onClick } from '../../framework/on-click';
import { Mediator } from '../../services/mediator';
import { BlockSelected, BlockUnselected } from '../timeline-bar/timeline-bar';
import { Block } from '../timeline-block/timeline-block';

export const createBlockEditor = inlineComponent(controls => {
  let block: Block,
    animator: Animator,
    timeline: Timeline;

  controls.setup('block-editor', 'block-editor');
  Mediator.onEvent<BlockSelected>('blockSelected', e => {
    console.log('Selected:', e.block);
    ({ block, animator, timeline } = e);
    controls.changed();
  });
  Mediator.onEvent<BlockUnselected>('blockUnselected', e => {
    if (e.block === block) {
      console.log('Unselected:', e.block);
      block = null;
      controls.changed();
    }
  });
  
  return () => !block ? `<span></span>` : [`
<div>
  <button class="block-editor_expand" type="button">Expand</button>
  <button class="block-editor_reduce" type="button">Reduce</button>
  <button class="block-editor_remove" type="button">Remove</button>
</div>
`, e => (
  onClick(e, '.block-editor_expand', () => expandBlock(animator, timeline, block)),
  onClick(e, '.block-editor_reduce', () => reduceBlock(animator, timeline, block)),
  onClick(e, '.block-editor_remove', () => removeBlock(animator, timeline, block))
  )];
});

function expandBlock(animator: Animator, timeline: Timeline, block: Block) {
  const lastAction: TimelineAction = block.actions[block.actions.length - 1];

  if (lastAction.type === ActionType.None) {
    animator.expandTimelineAction(timeline, 1, lastAction);
  } else {
    animator.insertTimelineAction(timeline, block.frames, { type: ActionType.None, amount: 1 });
  }
}

function reduceBlock(animator: Animator, timeline: Timeline, block: Block): void {
  const lastAction: TimelineAction = block.actions[block.actions.length - 1];

  if (lastAction.type === ActionType.None && lastAction.amount > 1) {
    animator.reduceTimelineAction(timeline, 1, lastAction);
  } else {
    animator.removeTimelineAction(timeline, lastAction);
  }
}

function removeBlock(animator: Animator, timeline: Timeline, block: Block): void {
  block.actions.forEach(a => {
    animator.removeTimelineAction(timeline, a);
  });
}
