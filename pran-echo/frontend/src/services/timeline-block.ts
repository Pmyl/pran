import { ActionType, DrawAction, NoneAction, TimelineAction } from 'pran-animation-frontend';

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