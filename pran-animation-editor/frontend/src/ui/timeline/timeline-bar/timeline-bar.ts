import {
  ActionType,
  Animator, NoneAction,
  Timeline,
  TimelineChange,
  TimelineChangeType
} from 'pran-animation-frontend';
import { Block, BlocksFilter } from '../../../core/block/block';
import { IEvent, Mediator } from '../../../core/mediator/mediator';
import { TimelineBar } from '../../../core/timeline/timeline-bar';
import { createBlock } from '../../block/block/block';
import { Container } from '../../framework/container';
import { inlineComponent } from '../../framework/inline-component';
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
    createBlockComponents(timelineBar.blocks, inputs, timelineBlocksContainer, (block: Block) => onBlockSelect(block, inputs));
  };

  const updateBlocks = (inputs: TimelineBarInputs, change: TimelineChange) => {
    switch (change.type) {
      case TimelineChangeType.ExpandAction:
        timelineBar.findBlockWithAction(change.action).recalculateFrames();
        break;
      case TimelineChangeType.ReduceAction:
        timelineBar.findBlockWithAction(change.action).recalculateFrames();
        break;
      case TimelineChangeType.ReplaceSameType:
        timelineBar.findBlockWithAction(change.actionToReplace).replaceAction(change.actionToReplace, change.replacement);
        break;
      case TimelineChangeType.InsertAction:
        if (change.action.type === ActionType.None) {
          const block: Block = timelineBar.findBlockBeforeFrame(change.frame) || timelineBar.findBlockAtFrame(change.frame);
          if (BlocksFilter.isWithActions(block)) {
            block.addNoneAction(change.action);
          } else {
            throw new Error(`Cannot add action to block without actions. Type: ${block.type}`);
          }
        } else {
          let blockIndex: number;

          if (BlocksFilter.isNothingness(timelineBar.blocks[0])) {
            blockIndex = 0;
            timelineBar.removeBlockAt(blockIndex);
            timelineBlocksContainer.removeAt(blockIndex);
          } else {
            const block: Block = timelineBar.findBlockBeforeFrame(change.frame);
            blockIndex = timelineBar.blocks.indexOf(block);
            block && block.removeVisualFrames();
          }

          const newBlocks = timelineBar.generateAt(blockIndex + 1, [change.action]);
          createBlockComponents(newBlocks, inputs, timelineBlocksContainer, (block: Block) => onBlockSelect(block, inputs), blockIndex + 1);
        }
        break;
      case TimelineChangeType.RemoveAction:
        if (change.action.type === ActionType.None) {
          timelineBar.findBlockWithAction(change.action)?.removeNoneAction(change.action);
        } else {
          const blockWithAction = timelineBar.findBlockWithAction(change.action);
          const blockIndex = timelineBar.blocks.indexOf(blockWithAction);
          const blockBefore = timelineBar.blocks[blockIndex - 1];
          timelineBar.removeBlockAt(blockIndex);
          timelineBlocksContainer.removeAt(blockIndex);
          Mediator.raiseEvent<BlockUnselected>('blockUnselected', { block: blockWithAction })

          if (blockBefore && BlocksFilter.isWithActions(blockBefore)) {
            blockWithAction.actions.filter(a => a.type === ActionType.None).forEach(a => {
              blockBefore.addNoneAction(a as NoneAction);
            });
          }
        }
        break;
    }
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

function createBlockComponents(blocks: readonly Block[], inputs: TimelineBarInputs, timelineBlocksContainer: Container, onSelect: (block: Block) => void, index?: number): void {
  blocks.map(block => {
    const blockComponent = createBlock().setInputs({
      block,
      frameWidth: inputs.frameWidth,
      timeline: inputs.timeline,
      animator: inputs.animator,
      onSelect: () => onSelect(block)
    });

    if (!index && index !== 0) {
      return blockComponent.appendTo(timelineBlocksContainer);
    } else {
      timelineBlocksContainer.insertAt(blockComponent, index);
      return blockComponent;
    }
  });
}
