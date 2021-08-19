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

export type BlockSelected = IEvent<'blockSelected', { block: Block, timeline: Timeline, animator: Animator, timelineBar: TimelineBar }>;
export type BlockUnselected = IEvent<'blockUnselected', { block: Block }>;
type TimelineBarInputs = { timeline: Timeline, animator: Animator, frameWidth: number };

export class TimelineBar {
  public blocks: Block[] = [];

  public findBlockWithAction(action: TimelineAction): Block {
    return this.blocks.find(b => b.actions.includes(action));
  }
  
  public findBlockBeforeFrame(frame: number): Block {
    for (let i = 0; i < this.blocks.length; i++) {
      const block = this.blocks[i];
      frame -= block.frames;
      if (frame === 0) {
        return this.blocks[i];
      }

      if (frame < 0) {
        // TODO: something weird happened and the timeline has to be re-rendered from scratch
      }
    }

    // TODO: something weird happened and the timeline has to be re-rendered from scratch
    return null;
  }
  
  public findBlockInitialFrame(block: Block): number {
    let frames = 0;

    for (let i = 0; i < this.blocks.length && this.blocks[i] !== block; i++) {
      frames += this.blocks[i].visualFrames;
    }

    return frames;
  }

  public generateAt(blockIndex: number, actions: TimelineAction[]): readonly Block[] {
    const newBlocks = this._identifyBlocks(actions, 1);
    this.blocks.splice(blockIndex, 0, ...newBlocks);

    return newBlocks;
  }

  public regenerate(timelineActions: readonly TimelineAction[], totalFrames: number): void {
    this.blocks.forEach(b => Mediator.raiseEvent<BlockUnselected>('blockUnselected', { block: b }));
    this.blocks = this._identifyBlocks(timelineActions, totalFrames);
  }
  
  public removeBlockAt(blockIndex: number) {
    this.blocks.splice(blockIndex, 1);
  }

  public adaptToTotalFrames(inputs: TimelineBarInputs): void {
    const totalFrames = this.blocks.reduce((sum, block) => {
      return sum + block.visualFrames;
    }, 0);

    const lastBlock: Block = this.blocks[this.blocks.length - 1];
    lastBlock.addVirtualFrames(inputs.animator.totalFrames - totalFrames);
  }

  private _identifyBlocks(timelineActions: readonly TimelineAction[], totalFrames: number): Block[] {
    const blocks = [];
    let currentBlock: ReturnType<typeof ClearBlock.Builder> | ReturnType<typeof ImageBlock.Builder> = null;
    let currentFrames: number = 0;

    timelineActions.forEach(a => {
      switch(a.type) {
        case ActionType.None:
          if (!currentBlock) {
            currentBlock = ClearBlock.Builder().addAction(a);
          } else {
            currentBlock.addAction(a);
          }
          currentFrames += a.amount;
          break;
        case ActionType.Draw:
          if (currentBlock) {
            blocks.push(currentBlock.build());
          }
          currentBlock = ImageBlock.Builder().addAction(a).withImage(a.image.src);
          currentFrames++;
          break;
        case ActionType.Clear:
          if (currentBlock) {
            blocks.push(currentBlock.build());
          }
          currentBlock = ClearBlock.Builder().addAction(a);
          currentFrames++;
          break;
        default:
          throw new Error("Unmapped action type");
      }
    });

    if (currentFrames < totalFrames) {
      currentBlock.addVirtualFrames(totalFrames - currentFrames);
    }
    blocks.push(currentBlock.build());
    return blocks;
  }
}

export const createTimelineBar = inlineComponent<TimelineBarInputs>(controls => {
  const timelineBlocksContainer = Container.CreateEmptyElement('div', 'timeline-bar_block-container');
  let unsubscribe: () => void,
    timelineBar: TimelineBar = new TimelineBar();
  
  const onBlockSelect = (block: Block, inputs: TimelineBarInputs) => {
    Mediator.raiseEvent<BlockSelected>('blockSelected', { block, timeline: inputs.timeline, animator: inputs.animator, timelineBar });
  }

  const renderBlocks = (inputs: TimelineBarInputs) => {
    const totalFrames = inputs.animator.totalFrames;
    timelineBar.regenerate(inputs.timeline.timelineActions, totalFrames);
    timelineBlocksContainer.clear();
    createBlockComponents(timelineBar.blocks, inputs, timelineBlocksContainer, (block: Block) => onBlockSelect(block, inputs));
    // TODO: remove this, used only to dev block controls
    Mediator.raiseEvent<BlockSelected>('blockSelected', { block: timelineBar.blocks[0], timeline: inputs.timeline, animator: inputs.animator, timelineBar });
  };

  const updateBlocks = (inputs: TimelineBarInputs, change: TimelineChange) => {
    switch (change.type) {
      case TimelineChangeType.Expand:
        timelineBar.findBlockWithAction(change.action).updateNoneFrames();
        break;
      case TimelineChangeType.Reduce:
        timelineBar.findBlockWithAction(change.action).updateNoneFrames();
        break;
      case TimelineChangeType.ReplaceSameType:
        timelineBar.findBlockWithAction(change.actionToReplace).replaceAction(change.actionToReplace, change.replacement);
        break;
      case TimelineChangeType.Insert:
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
      case TimelineChangeType.Remove:
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
    timelineBar.adaptToTotalFrames(inputs);
  }

  controls.setup('timeline-bar', 'timeline-bar');
  controls.onInputsChange = inputs => {
    controls.mandatoryInput('timeline')
    && controls.mandatoryInput('animator')
    && controls.mandatoryInput('frameWidth');
    renderBlocks(inputs);
    unsubscribe?.();
    unsubscribe = inputs.animator.onTimelineChange((timeline: Timeline, change: TimelineChange) => (
      timeline === inputs.timeline ? updateBlocks(inputs, change) : timelineBar.adaptToTotalFrames(inputs),
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
