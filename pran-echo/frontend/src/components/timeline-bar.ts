import { ActionType, Animator, Timeline, TimelineAction } from 'pran-animation-frontend';
import './timeline-bar.css';

const FRAME_WIDTH: number = 20;

export class TimelineBar {
  public frameWidth: number = FRAME_WIDTH;

  private _parent: HTMLElement;
  private _timeline: Timeline;
  private _animator: Animator;
  private _barContainer: HTMLElement;

  constructor(timeline: Timeline, animator: Animator, parent: HTMLElement) {
    this._parent = parent;
    this._timeline = timeline;
    this._animator = animator;
    this._parent.append(this._generateAndStoreTimelineBarContainer());
  }
  
  public render() {
    this._barContainer.outerHTML = this._generateContent().outerHTML;
  }

  private _generateAndStoreTimelineBarContainer() {
    this._barContainer = document.createElement('div');
    return this._barContainer;
  }

  private _generateContent(): HTMLElement {
    const div = document.createElement('template');
    // TODO: fix performance hit here, animator should have this info ready
    // to ensure this happens I should make sure the exposed timeline is readonly
    // and every change is made through the Animator (this number is updated only on timeline change)
    const totalFrames = Math.max.apply(
      Math,
      this._animator.timelines
        .map(t =>
          t.timelineActions.reduce((acc, action) => {
            return acc + (action.type === ActionType.None ? action.amount : 1);
          }, 0)
        )
    );
    const blocks = this._identifyBlocks(this._timeline.timelineActions, totalFrames);

    div.innerHTML = `
<div class="timeline-bar_block-container" style="width: ${totalFrames * this.frameWidth}px">
    ${blocks.map(b => this._createBlock(b)).join('')}
</div>
`.trim();

    return div.content.firstChild as HTMLElement;
  }

  private _createBlock(block: Block) {
    const thumbnail = this._createThumbnail(block);

    return `
<div class="timeline-bar_block" style="flex-basis:${block.frames * this.frameWidth}px">
    ${thumbnail}
</div>
`;
  }

  private _createThumbnail(block: Block) {
    if (block.type === BlockType.Image) {
      return `<img
        class = "timeline-bar_draw-thumbnail"
        alt = "draw block image"
        src = "${block.imageSrc}" / >`
    }

    return `<img
        class = "timeline-bar_clear-thumbnail"
        alt = "clear block image"
        src = "./resources/clear.png" / >`
  }

  private _identifyBlocks(timelineActions: TimelineAction[], totalFrames: number): Block[] {
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
}

enum BlockType {
  Image,
  Clear
}

interface ImageBlock {
  frames: number;
  type: BlockType.Image;
  imageSrc: string;
}

interface ClearBlock {
  frames: number;
  type: BlockType.Clear;
}

type Block = ImageBlock | ClearBlock;