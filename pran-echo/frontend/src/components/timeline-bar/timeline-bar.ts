import {
  ActionType,
  Animator, NoneAction,
  Timeline,
  TimelineAction,
  TimelineChange,
  TimelineChangeType
} from 'pran-animation-frontend';
import { inlineComponent } from '../../framework/inline-component';
import { IEvent, Mediator } from '../../services/mediator';
import { Container } from '../container/container';
import { Block, ClearBlock, createTimelineBlock, ImageBlock } from '../timeline-block/timeline-block';
import './timeline-bar.css';

export type BlockSelected = IEvent<'blockSelected', { block: Block, timeline: Timeline, animator: Animator }>;
export type BlockUnselected = IEvent<'blockUnselected', { block: Block }>;
type TimelineBarInputs = { timeline: Timeline, animator: Animator, frameWidth: number };

function findBlockWithAction(blocks: Block[], action: TimelineAction): Block {
  return blocks.find(b => b.actions.includes(action));
}

function findBlockBeforeFrame(blocks: Block[], frame: number): Block {
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    frame -= block.frames;
    if (frame === 0) {
      return block[i];
    }
    
    if (frame < 0) {
      // TODO: something weird happened and the timeline has to be re-rendered from scratch
    }
  }

  // TODO: something weird happened and the timeline has to be re-rendered from scratch
  return null;
}

export const createTimelineBar = inlineComponent<TimelineBarInputs>(controls => {
  const timelineBlocksContainer = Container.CreateEmptyElement('div', 'timeline-bar_block-container');
  let unsubscribe: () => void,
    currentBlocks: Block[];
  
  const onBlockSelect = (block: Block, inputs: TimelineBarInputs) => {
    Mediator.raiseEvent<BlockSelected>('blockSelected', { block, timeline: inputs.timeline, animator: inputs.animator });
  }

  const renderBlocks = (inputs: TimelineBarInputs) => {
    (currentBlocks || []).forEach(b => Mediator.raiseEvent<BlockUnselected>('blockUnselected', { block: b }));
    const totalFrames = inputs.animator.totalFrames;
    currentBlocks = identifyBlocks(inputs.timeline.timelineActions, totalFrames);
    timelineBlocksContainer.clear();
    createBlockComponents(currentBlocks, inputs, timelineBlocksContainer, (block: Block) => onBlockSelect(block, inputs));
  };

  const updateBlocks = (inputs: TimelineBarInputs, change: TimelineChange) => {
    switch (change.type) {
      case TimelineChangeType.Expand:
        findBlockWithAction(currentBlocks, change.action).addFrames(change.amount);
        break;
      case TimelineChangeType.Reduce:
        findBlockWithAction(currentBlocks, change.action).addFrames(-change.amount);
        break;
      case TimelineChangeType.Insert:
        if (change.action.type === ActionType.None) {
          const block: Block = findBlockBeforeFrame(currentBlocks, change.frame);
          block.addNoneAction(change.action);
        } else {
          const block: Block = findBlockBeforeFrame(currentBlocks, change.frame);
          const blockIndex = currentBlocks.indexOf(block);
          const newBlocks = identifyBlocks([change.action], 1);
          currentBlocks.splice(blockIndex, 0, ...newBlocks);
          createBlockComponents(newBlocks, inputs, timelineBlocksContainer, (block: Block) => onBlockSelect(block, inputs), blockIndex + 1);
        }
        break;
      case TimelineChangeType.Remove:
        if (change.action.type === ActionType.None) {
          findBlockWithAction(currentBlocks, change.action).removeNoneAction(change.action);
        } else {
          const blockWithAction = findBlockWithAction(currentBlocks, change.action);
          const blockIndex = currentBlocks.indexOf(blockWithAction);
          const blockBefore = currentBlocks[blockIndex - 1];
          currentBlocks.splice(blockIndex, 1);
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
    adaptToTotalFrames(inputs, currentBlocks);
  }

  controls.setup('timeline-bar', 'timeline-bar');
  controls.onInputsChange = inputs => {
    controls.mandatoryInput('timeline')
    && controls.mandatoryInput('animator')
    && controls.mandatoryInput('frameWidth');
    renderBlocks(inputs);
    unsubscribe?.();
    unsubscribe = inputs.animator.onTimelineChange((timeline: Timeline, change: TimelineChange) => (
      timeline === inputs.timeline ? updateBlocks(inputs, change) : adaptToTotalFrames(inputs, currentBlocks),
      controls.changed()
    ));
  };
  controls.onDestroy = unsubscribe;

  return () => timelineBlocksContainer;
});

function identifyBlocks(timelineActions: readonly TimelineAction[], totalFrames: number): Block[] {
  const blocks = [];
  let currentBlock: ReturnType<typeof ClearBlock.Builder> | ReturnType<typeof ImageBlock.Builder> = null;
  let currentFrames: number = 0;

  timelineActions.forEach(a => {
    switch(a.type) {
      case ActionType.None:
        if (!currentBlock) {
          currentBlock = ClearBlock.Builder().addAction(a).addFrames(a.amount);
        } else {
          currentBlock.addFrames(a.amount).addAction(a);
        }
        currentFrames += a.amount;
        break;
      case ActionType.Draw:
        if (currentBlock) {
          blocks.push(currentBlock.build());
        }
        currentBlock = ImageBlock.Builder().addAction(a).withImage(a.image.src).addFrame();
        currentFrames++;
        break;
      case ActionType.Clear:
        if (currentBlock) {
          blocks.push(currentBlock.build());
        }
        currentBlock = ClearBlock.Builder().addAction(a).addFrame();
        currentFrames++;
        break;
      default:
        throw new Error("Unmapped action type");
    }
  });

  if (currentFrames < totalFrames) {
    currentBlock.addFrames(totalFrames - currentFrames);
  }
  blocks.push(currentBlock.build());

  return blocks;
}

function createBlockComponents(blocks: Block[], inputs: TimelineBarInputs, timelineBlocksContainer: Container, onSelect: (block: Block) => void, index?: number): void {
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

function adaptToTotalFrames(inputs: TimelineBarInputs, blocks: Block[]): void {
  const totalFrames = blocks.reduce((sum, block) => {
    return sum + block.frames;
  }, 0);
  
  const lastBlock: Block = blocks[blocks.length - 1];
  lastBlock.addFrames(inputs.animator.totalFrames - totalFrames);
}
