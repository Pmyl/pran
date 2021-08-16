import './timeline-block.css';
import { ActionType, Animator, NoneAction, Timeline, TimelineAction } from 'pran-animation-frontend';
import { inlineComponent } from '../../framework/inline-component';
import { onClick } from '../../framework/on-click';

export enum BlockType {
  Image,
  Clear
}

export class ImageBlock {
  public readonly type: BlockType.Image = BlockType.Image;
  public get frames(): number {
    return this._frames;
  }
  public get imageSrc(): string {
    return this._imageSrc;
  }
  private _frames: number = 0;
  private _imageSrc: string;
  private _actions: TimelineAction[] = [];
  
  public expandBy1(animator: Animator, timeline: Timeline) {
    // TODO: random assumption that it's a NoneAction, this won't work if we have a single frame of draw/clear, to fix
    const lastAction = this._actions[this._actions.length - 1] as NoneAction;
    
    const newAction: TimelineAction = { type: ActionType.None, amount: lastAction.amount + 1 };
    animator.updateTimelineAction(timeline, lastAction, [newAction]);
  }
    
  
  public static Builder() {
    const block = new ImageBlock();

    return {
      withImage(imageSrc: string) { block._imageSrc = imageSrc; return this; }, 
      addFrame() { block._frames++; return this; },
      addFrames(amount: number) { block._frames += amount; return this; },
      addAction(action: TimelineAction) { block._actions.push(action); return this; },
      build: () => block
    };
  }
}

export class ClearBlock {
  public readonly type: BlockType.Clear = BlockType.Clear;
  public get frames(): number {
    return this._frames;
  }

  private _frames: number = 0;
  private _actions: TimelineAction[] = [];

  public expandBy1(animator: Animator, timeline: Timeline) {
    // TODO: random assumption that it's a NoneAction, this won't work if we have a single frame of draw/clear, to fix
    const lastAction = this._actions[this._actions.length - 1] as NoneAction;

    const newAction: TimelineAction = { type: ActionType.None, amount: lastAction.amount + 1 };
    animator.updateTimelineAction(timeline, lastAction, [newAction]);
  }

  public static Builder() {
    const block = new ClearBlock();

    return {
      addFrame() { block._frames++; return this; },
      addFrames(amount: number) { block._frames += amount; return this; },
      addAction(action: TimelineAction) { block._actions.push(action); return this; },
      build: () => block
    };
  }
}

export type Block = ImageBlock | ClearBlock;

export const createTimelineBlock = inlineComponent<{ block: Block, timeline: Timeline, animator: Animator, frameWidth: number }>(controls => {
  controls.setup('timeline-block', 'timeline-block');

  return inputs => controls.mandatoryInput('block')
    && controls.mandatoryInput('frameWidth')
    && controls.mandatoryInput('animator')
    && controls.mandatoryInput('timeline')
    && [`
<div class="timeline-block_block" style="width:${inputs.block.frames * inputs.frameWidth}px">
    ${createThumbnailHTML(inputs.block)}
</div>`, el => onClick(el, '.timeline-block_block', () => (
    console.log('Selected:', inputs.block),
    inputs.block.expandBy1(inputs.animator, inputs.timeline)
  ))];
});

  function createThumbnailHTML(block: Block): string {
  if (block.type === BlockType.Image) {
    return `<img
        class = "timeline-block_draw-thumbnail"
        alt = "draw block image"
        src = "${block.imageSrc}" / >`
  }

  return `<img
        class = "timeline-block_clear-thumbnail"
        alt = "clear block image"
        src = "./resources/clear.png" / >`
}
