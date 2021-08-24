import { ActionType, Animator, TimelineAction } from 'pran-animation-frontend';
import { Block, ClearBlock, ImageBlock } from './timeline-block';

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

  public regenerate(timelineActions: readonly TimelineAction[], totalFrames: number): readonly Block[] {
    const removedBlocks = this.blocks.slice();
    this.blocks = this._identifyBlocks(timelineActions, totalFrames);
    return removedBlocks;
  }

  public removeBlockAt(blockIndex: number) {
    this.blocks.splice(blockIndex, 1);
  }

  public adaptToTotalFrames(animator: Animator): void {
    const totalFrames = this.blocks.reduce((sum, block) => {
      return sum + block.visualFrames;
    }, 0);

    const lastBlock: Block = this.blocks[this.blocks.length - 1];
    lastBlock.addVirtualFrames(animator.totalFrames - totalFrames);
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