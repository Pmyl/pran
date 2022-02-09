import {
  Animator, Timeline,
  TimelineChange
} from 'pran-animation-frontend';
import { Container, inlineComponent } from 'pran-gular-frontend';
import { Block} from '../../../core/block/block';
import { IEvent, Mediator } from '../../../core/mediator/mediator';
import { TimelineBar } from '../../../core/timeline/timeline-bar';
import { createBlock } from '../../block/block/block';
import './timeline-bar.css';

export type BlockSelected = IEvent<'blockSelected', { block: Block, timeline: Timeline, animator: Animator, timelineBar: TimelineBar }>;
export type BlockUnselected = IEvent<'blockUnselected', { block: Block }>;
type TimelineBarInputs = { timeline: Timeline, animator: Animator, frameWidth: number };

export const createTimelineBar = inlineComponent<TimelineBarInputs>(controls => {
  const timelineBlocksContainer = Container.CreateEmptyElement('div', 'timeline-bar_block-container');
  let unsubscribe: () => void,
    timelineBar: TimelineBar = new TimelineBar();
  
  const onBlockSelect = (block: Block, inputs: TimelineBarInputs) => {
    Mediator.raiseEvent<BlockSelected>('blockSelected', { block, timeline: inputs.timeline, animator: inputs.animator, timelineBar });
  }

  const renderBlocks = (inputs: TimelineBarInputs) => {
    const totalFrames = inputs.animator.totalFrames;
    const removedBlocks = timelineBar.regenerate(inputs.timeline.timelineActions, totalFrames);
    removedBlocks.forEach(b => Mediator.raiseEvent<BlockUnselected>('blockUnselected', { block: b }));

    timelineBlocksContainer.clear();
    createBlockComponents(timelineBar.blocks, inputs, timelineBlocksContainer, (block: Block) => onBlockSelect(block, inputs), false);
  };

  const updateBlocks = (inputs: TimelineBarInputs, change: TimelineChange) => {
    const blocksChanges = timelineBar.updateBlocks(change);
    blocksChanges.added.forEach(added => {
      createBlockComponents(added.blocks, inputs, timelineBlocksContainer, (block: Block) => onBlockSelect(block, inputs), true, added.index);
    });
    blocksChanges.removed.forEach(removed => {
      timelineBlocksContainer.removeAt(removed.index);
    });
    timelineBar.adaptToTotalFrames(inputs.animator.totalFrames);
  }

  controls.setup('timeline-bar', 'timeline-bar');
  controls.onInputsChange = inputs => {
    controls.mandatoryInput('timeline')
    && controls.mandatoryInput('animator')
    && controls.mandatoryInput('frameWidth');
    renderBlocks(inputs);
    unsubscribe?.();
    unsubscribe = inputs.animator.onTimelineChange((timeline: Timeline, change: TimelineChange) => (
      timeline === inputs.timeline ? updateBlocks(inputs, change) : timelineBar.adaptToTotalFrames(inputs.animator.totalFrames),
      controls.changed()
    ));
  };
  controls.onDestroy = unsubscribe;

  return () => timelineBlocksContainer;
});

function createBlockComponents(blocks: readonly Block[], inputs: TimelineBarInputs, timelineBlocksContainer: Container, onSelect: (block: Block) => void, isHighlighted: boolean, index?: number): void {
  blocks.map(block => {
    const blockComponent = createBlock().setInputs({
      block,
      frameWidth: inputs.frameWidth,
      timeline: inputs.timeline,
      animator: inputs.animator,
      onSelect: () => onSelect(block),
      isHighlighted
    });

    if (!index && index !== 0) {
      return blockComponent.appendTo(timelineBlocksContainer);
    } else {
      timelineBlocksContainer.insertAt(blockComponent, index);
      return blockComponent;
    }
  });
}
