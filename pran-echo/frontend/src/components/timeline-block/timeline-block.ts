import { ActionType, Animator, DrawAction, NoneAction, Timeline, TimelineAction } from 'pran-animation-frontend';
import { Component } from '../../framework/component';
import { inlineComponent } from '../../framework/inline-component';
import { onClick } from '../../framework/on-click';
import './timeline-block.css';
import { staticElement } from '../../framework/static-element';
import { Mediator } from '../../services/mediator';
import { BlockSelected } from '../timeline-bar/timeline-bar';
import { createTimelineBlockHandles } from './timeline-block-handles';

export enum BlockType {
  Image,
  Clear
}

export abstract class BaseBlock {
  public get visualFrames(): number {
    return this._frames + this._virtualFrames;
  }
  public get frames(): number {
    return this._frames;
  }
  public get virtualFrames(): number {
    return this._virtualFrames;
  }
  public get actions(): readonly TimelineAction[] {
    return this._actions;
  }
  public get noneAmount(): number {
    return this._frames - 1;
  }

  protected _frames: number = 0;
  protected _virtualFrames: number = 0;
  protected _actions: TimelineAction[] = [];
  
  private _onChangeSubscriptions: (() => void)[] = [];
  
  public addVirtualFrames(amount: number) {
    this._virtualFrames += amount;
    this._notifyChanges();
  }
  
  public removeVirtualFrames() {
    this._virtualFrames = 0;
    this._notifyChanges();
  }
  
  public updateNoneFrames() {
    this._frames = 0;
    this._actions.forEach(action => {
      this._frames += action.type === ActionType.None ? action.amount : 1;
    });
    this._notifyChanges();
  }
  
  public addNoneAction(action: NoneAction) {
    this._virtualFrames = Math.max(0, this._virtualFrames - action.amount);
    this._frames += action.amount;
    this._actions.push(action);
    this._notifyChanges();
  }
  
  public abstract replaceAction<T extends TimelineAction>(actionToReplace: T, replacement: T);
  
  public removeNoneAction(action: NoneAction) {
    this._frames -= action.amount;
    this._actions.splice(this._actions.indexOf(action), 1);
    this._notifyChanges();
  }
  
  public onChange(cb: () => void): () => void {
    this._onChangeSubscriptions.push(cb);
    return () => this._onChangeSubscriptions.splice(this._onChangeSubscriptions.indexOf(cb), 1);
  }
  
  protected _notifyChanges() {
    this._onChangeSubscriptions.forEach(s => s());
  }

  protected static BaseBuilder(block: BaseBlock) {
    return {
      addVirtualFrames(amount: number) {
        block._virtualFrames += amount;
        return this;
      },
      addAction(action: TimelineAction) {
        if (action.type === ActionType.None && action.amount <= 0) {
          return this;
        }

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

  public replaceAction<T extends TimelineAction>(actionToReplace: T, replacement: T) {
    this._actions.splice(this._actions.indexOf(actionToReplace), 1, replacement);
    this._imageSrc = (replacement as DrawAction).image.src;
    this._notifyChanges();
  }

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

  public replaceAction<T extends TimelineAction>(actionToReplace: T, replacement: T) {
    this._actions.splice(this._actions.indexOf(actionToReplace), 1, replacement);
    this._notifyChanges();
  }

  public static Builder() {
    return BaseBlock.BaseBuilder(new ClearBlock());
  }
}

export type Block = ImageBlock | ClearBlock;

export const createTimelineBlock = inlineComponent<{ block: Block, timeline: Timeline, animator: Animator, frameWidth: number, onSelect: () => void }>(controls => {
  controls.setup('timeline-block', 'timeline-block');

  const handles = createTimelineBlockHandles();
  let unsubscribeOnChange: () => void,
    unsubscribeEvent: () => void,
    isSelected: boolean = false;

  controls.onInputChange = {
    block: b => {
      unsubscribeOnChange?.();
      unsubscribeOnChange = b.onChange(controls.changed);
      unsubscribeEvent?.();
      unsubscribeEvent = Mediator.onEvent<BlockSelected>('blockSelected', ({ block: selectedBlock, animator, timeline, timelineBar }) => (
        isSelected = selectedBlock === b,
        handles.setInputs({ isSelected, block: selectedBlock, animator, timeline, timelineBar }),
        controls.changed()
      ));
      handles.setInput('block', b);
    },
    frameWidth: fw => {
      handles.setInput('frameWidth', fw);
    }
  };

  controls.onDestroy = () => unsubscribeOnChange?.();
  return inputs => controls.mandatoryInput('block')
    && controls.mandatoryInput('frameWidth')
    && controls.mandatoryInput('animator')
    && controls.mandatoryInput('timeline')
    && [[handles, `
<div class="timeline-block_block${isSelected ? ' isSelected' : ''}" style="width:${inputs.block.visualFrames * inputs.frameWidth}px">
    ${createThumbnailHTML(inputs.block)}
</div>`], el => onClick(el, '.timeline-block_block', () => inputs.onSelect())];
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
