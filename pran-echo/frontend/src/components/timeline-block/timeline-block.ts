import { ActionType, Animator, NoneAction, Timeline, TimelineAction } from 'pran-animation-frontend';
import { inlineComponent } from '../../framework/inline-component';
import { onClick } from '../../framework/on-click';
import './timeline-block.css';

export enum BlockType {
  Image,
  Clear
}

export abstract class BaseBlock {
  public get frames(): number {
    return this._frames;
  }
  public get actions(): readonly TimelineAction[] {
    return this._actions;
  }
  public get noneAmount(): number {
    return this._actions.reduce((sum, a) => sum + (a.type === ActionType.None ? a.amount : 0), 0);
  }

  protected _frames: number = 0;
  protected _actions: TimelineAction[] = [];
  
  private _onChangeSubscriptions: (() => void)[] = [];
  
  public addFrames(amount: number) {
    this._frames += amount;
    this._notifyChanges();
  }
  
  public addNoneAction(action: NoneAction) {
    this._frames += action.amount;
    this._actions.push(action);
    this._notifyChanges();
  }
  
  public removeNoneAction(action: NoneAction) {
    this._frames -= action.amount;
    this._actions.splice(this._actions.indexOf(action), 1);
    this._notifyChanges();
  }
  
  public onChange(cb: () => void): () => void {
    this._onChangeSubscriptions.push(cb);
    return () => this._onChangeSubscriptions.splice(this._onChangeSubscriptions.indexOf(cb), 1);
  }
  
  private _notifyChanges() {
    this._onChangeSubscriptions.forEach(s => s());
  }

  protected static BaseBuilder(block: BaseBlock) {
    return {
      addVirtualFrames(amount: number) {
        block._frames += amount; return this;
      },
      addAction(action: TimelineAction) {
        block._frames += action.type === ActionType.None ? action.amount : 1;
        block._actions.push(action);
        return this;
      },
      build: () => block
    };
  }
}

export class ImageBlock extends BaseBlock {
  public readonly type: BlockType.Image = BlockType.Image;
  public get imageSrc(): string {
    return this._imageSrc;
  }
  private _imageSrc: string;

  public static Builder() {
    const block = new ImageBlock();

    return {
      ...BaseBlock.BaseBuilder(block),
      withImage(imageSrc: string) { block._imageSrc = imageSrc; return this; }
    };
  }
}

export class ClearBlock extends BaseBlock {
  public readonly type: BlockType.Clear = BlockType.Clear;

  public static Builder() {
    return BaseBlock.BaseBuilder(new ClearBlock());
  }
}

export type Block = ImageBlock | ClearBlock;

export const createTimelineBlock = inlineComponent<{ block: Block, timeline: Timeline, animator: Animator, frameWidth: number, onSelect: () => void }>(controls => {
  controls.setup('timeline-block', 'timeline-block');
  let unsubscribe: () => void;

  controls.onInputChange = {
    block: b => {
      unsubscribe?.();
      unsubscribe = b.onChange(controls.changed);
    }
  };
  controls.onDestroy = () => unsubscribe?.();

  return inputs => controls.mandatoryInput('block')
    && controls.mandatoryInput('frameWidth')
    && controls.mandatoryInput('animator')
    && controls.mandatoryInput('timeline')
    && [`
<div class="timeline-block_block" style="width:${inputs.block.frames * inputs.frameWidth}px">
    ${createThumbnailHTML(inputs.block)}
</div>`, el => onClick(el, '.timeline-block_block', () => inputs.onSelect())];
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
