import { ActionType, NoneAction, TimelineAction, TimelineChange, TimelineChangeType } from 'pran-animation-frontend';
import { BlockUnselected } from '../../ui/timeline/timeline-bar/timeline-bar';
import { Block, BlocksFilter, BlocksWithActions, ClearBlock, ImageBlock, NothingnessBlock } from '../block/block';
import { Mediator } from '../mediator/mediator';

export class TimelineBar {
  public static minLength: number = 5;
  public blocks: Block[] = [];

  public findBlockWithAction(action: TimelineAction): BlocksWithActions {
    return this.blocks
      .filter(BlocksFilter.isWithActions)
      .find(b => b.actions.includes(action));
  }

  public findBlockAtFrame(frame: number): Block {
    if (frame === 0) return null;

    for (let i = 0; i < this.blocks.length; i++) {
      const block = this.blocks[i];
      frame -= block.visualFrames;
      if (frame == 0) {
        return null;
      }

      if (frame < 0) {
        return this.blocks[i];
      }
    }

    return null;
  }

  public findBlockBeforeFrame(frame: number): Block {
    for (let i = 0; i < this.blocks.length; i++) {
      const block = this.blocks[i];
      frame -= BlocksFilter.isWithActions(block) ? block.frames : block.visualFrames;
      if (frame == 0) {
        return this.blocks[i];
      }

      if (frame < 0) {
        return null;
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
    const newBlocks = this._identifyBlocks(actions);
    this.blocks.splice(blockIndex, 0, ...newBlocks);

    return newBlocks;
  }

  public insertAt(blockIndex: number, block: Block): void {
    this.blocks.splice(blockIndex, 0, block);
  }
  
  public updateBlocks(change: TimelineChange) {
    const updateResult = {
      added: [],
      removed: []
    };

    switch (change.type) {
      case TimelineChangeType.ExpandAction:
        this.findBlockWithAction(change.action).recalculateFrames();
        break;
      case TimelineChangeType.ReduceAction:
        this.findBlockWithAction(change.action).recalculateFrames();
        break;
      case TimelineChangeType.ReplaceSameType:
        this.findBlockWithAction(change.actionToReplace).replaceAction(change.actionToReplace, change.replacement);
        break;
      case TimelineChangeType.InsertAction:
        if (change.action.type === ActionType.None) {
          const block: Block = this.findBlockBeforeFrame(change.frame) || this.findBlockAtFrame(change.frame);
          if (BlocksFilter.isWithActions(block)) {
            block.addNoneAction(change.action);
          } else {
            throw new Error(`Cannot add action to block without actions. Type: ${block.type}`);
          }
        } else {
          let blockIndex: number;

          if (BlocksFilter.isNothingness(this.blocks[0])) {
            blockIndex = 0;
            this.removeBlockAt(blockIndex);
            updateResult.removed.push({ index: blockIndex });
          } else {
            const block: Block = this.findBlockBeforeFrame(change.frame);
            blockIndex = this.blocks.indexOf(block);
            block && block.removeVisualFrames();
          }

          const newBlocks = this.generateAt(blockIndex + 1, [change.action]);
          updateResult.added.push({ blocks: newBlocks, index: blockIndex + 1 });
        }
        break;
      case TimelineChangeType.RemoveAction:
        if (change.action.type === ActionType.None) {
          this.findBlockWithAction(change.action)?.removeNoneAction(change.action);
        } else {
          const blockWithAction = this.findBlockWithAction(change.action);
          const blockIndex = this.blocks.indexOf(blockWithAction);
          const blockBefore = this.blocks[blockIndex - 1];
          this.removeBlockAt(blockIndex);
          updateResult.removed.push({ index: blockIndex });
          Mediator.raiseEvent<BlockUnselected>('blockUnselected', { block: blockWithAction })

          if (blockBefore && BlocksFilter.isWithActions(blockBefore)) {
            blockWithAction.actions.filter(a => a.type === ActionType.None).forEach(a => {
              blockBefore.addNoneAction(a as NoneAction);
            });
          }
        }
        break;
    }
    
    return updateResult;
  }

  public regenerate(timelineActions: readonly TimelineAction[], totalFrames: number): readonly Block[] {
    const removedBlocks = this.blocks.slice();
    this.blocks = this._identifyBlocks(timelineActions);
    this.adaptToTotalFrames(totalFrames);
    return removedBlocks;
  }

  public removeBlockAt(blockIndex: number) {
    this.blocks.splice(blockIndex, 1);
  }

  public adaptToTotalFrames(animationFrames: number): void {
    if (this.blocks.length === 0) {
      this.insertAt(0, NothingnessBlock.Builder().addVisualFrames(TimelineBar.minLength).build());
    }

    const barFrames = this.blocks.reduce((sum, block) => {
      return sum + block.visualFrames;
    }, 0);

    const lastBlock: Block = this.blocks[this.blocks.length - 1];
    lastBlock.addVisualFrames(Math.max(TimelineBar.minLength, animationFrames) - barFrames);
  }

  private _identifyBlocks(timelineActions: readonly TimelineAction[]): Block[] {
    const blocks = [];
    let currentBlock: ReturnType<typeof ClearBlock.Builder> | ReturnType<typeof ImageBlock.Builder> | null = null;
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
          currentBlock = ImageBlock.Builder().addAction(a);
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

    if (currentBlock) {
      blocks.push(currentBlock.build());
    }

    return blocks;
  }
}