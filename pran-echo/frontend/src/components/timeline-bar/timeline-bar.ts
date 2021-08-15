import './timeline-bar.css';
import { ActionType, Animator, Timeline, TimelineAction } from 'pran-animation-frontend';
import { Component, RenderResult } from '../../framework/component';
import { Container } from '../container/container';
import { Block, BlockType, createTimelineBlock } from '../timeline-block/timeline-block';

const FRAME_WIDTH: number = 20;

export class TimelineBar extends Component {
  public frameWidth: number = FRAME_WIDTH;

  private _timeline: Timeline;
  private _animator: Animator;
  private readonly _timelineBlocksContainer: Component;

  constructor(timeline: Timeline, animator: Animator) {
    super('timeline-bar', 'timeline-bar');
    this._timeline = timeline;
    this._animator = animator;
    this._timelineBlocksContainer = Container.CreateEmptyElement('div', 'timeline-bar_block-container');
  }

  protected override _render(): RenderResult {
    const totalFrames = this._animator.totalFrames;
    const blocks = this._identifyBlocks(this._timeline.timelineActions, totalFrames);
    this._createBlockComponents(blocks, this.frameWidth);

    return this._timelineBlocksContainer;
  }

  private _identifyBlocks(timelineActions: readonly TimelineAction[], totalFrames: number): Block[] {
    const blocks = [];
    let currentBlock: Block = null;
    let currentFrames: number = 0;

    timelineActions.forEach(a => {
      switch(a.type) {
        case ActionType.None:
          if (!currentBlock) {
            currentBlock = { frames: a.amount, type: BlockType.Clear };
          } else {
            currentBlock.frames += a.amount;
          }
          currentFrames += a.amount;
          break;
        case ActionType.Draw:
          currentBlock = { frames: 1, type: BlockType.Image, imageSrc: a.image.src };
          blocks.push(currentBlock);
          currentFrames++;
          break;
        case ActionType.Clear:
          currentBlock = { frames: 1, type: BlockType.Clear };
          blocks.push(currentBlock);
          currentFrames++;
          break;
        default:
          throw new Error("Unmapped action type");
      }
    });
    
    if (currentFrames < totalFrames) {
      blocks[blocks.length - 1].frames += totalFrames - currentFrames;
    }

    return blocks;
  }

  private _createBlockComponents(blocks: Block[], frameWidth: number): Component[] {
    return blocks.map(block => createTimelineBlock().setInputs({ block, frameWidth }).render().appendTo(this._timelineBlocksContainer));
  }
}