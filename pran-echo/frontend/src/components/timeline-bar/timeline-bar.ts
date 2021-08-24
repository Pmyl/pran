import {
  ActionType,
  Animator, NoneAction,
  Timeline,
  TimelineChange,
  TimelineChangeType
} from 'pran-animation-frontend';
import { inlineComponent } from '../../framework/inline-component';
import { IEvent, Mediator } from '../../services/mediator';
import { TimelineBar } from '../../services/timeline-bar';
import { Block } from '../../services/timeline-block';
import { Container } from '../container/container';
import { createTimelineBlock } from '../timeline-block/timeline-block';
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
    // TODO: remove this, used only to dev block controls
    Mediator.raiseEvent<BlockSelected>('blockSelected', { block: timelineBar.blocks[0], timeline: inputs.timeline, animator: inputs.animator, timelineBar });
  };

  const updateBlocks = (inputs: TimelineBarInputs, change: TimelineChange) => {
    switch (change.type) {
      case TimelineChangeType.ExpandAction:
        timelineBar.findBlockWithAction(change.action).updateNoneFrames();
        break;
      case TimelineChangeType.ReduceAction:
        timelineBar.findBlockWithAction(change.action).updateNoneFrames();
        break;
      case TimelineChangeType.ReplaceSameType:
        timelineBar.findBlockWithAction(change.actionToReplace).replaceAction(change.actionToReplace, change.replacement);
        break;
      case TimelineChangeType.InsertAction:
        if (change.action.type === ActionType.None) {
          const block: Block = timelineBar.findBlockBeforeFrame(change.frame);
          block.addNoneAction(change.action);
        } else {
          const block: Block = timelineBar.findBlockBeforeFrame(change.frame);
          const blockIndex = timelineBar.blocks.indexOf(block);
          block && block.removeVirtualFrames();
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

          if (blockBefore) {
            blockWithAction.actions.filter(a => a.type === ActionType.None).forEach(a => {
              blockBefore.addNoneAction(a as NoneAction);
            });
          }
        }
        break;
    }
    timelineBar.adaptToTotalFrames(inputs.animator);
  }

  controls.setup('timeline-bar', 'timeline-bar');
  controls.onInputsChange = inputs => {
    controls.mandatoryInput('timeline')
    && controls.mandatoryInput('animator')
    && controls.mandatoryInput('frameWidth');
    renderBlocks(inputs);
    unsubscribe?.();
    unsubscribe = inputs.animator.onTimelineChange((timeline: Timeline, change: TimelineChange) => (
      timeline === inputs.timeline ? updateBlocks(inputs, change) : timelineBar.adaptToTotalFrames(inputs.animator),
      controls.changed()
    ));
  };
  controls.onDestroy = unsubscribe;

  return () => timelineBlocksContainer;
});

function createBlockComponents(blocks: readonly Block[], inputs: TimelineBarInputs, timelineBlocksContainer: Container, onSelect: (block: Block) => void, index?: number): void {
  blocks.map(block => {
    const blockComponent = createTimelineBlock().setInputs({
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
