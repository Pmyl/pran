import { ActionType, DrawAction, NoneAction, TimelineAction } from 'pran-animation-frontend';

export enum BlockType {
  Image,
  Clear,
  Nothingness
}

export abstract class BaseBlock {
  public abstract type: BlockType;
  public get visualFrames(): number {
    return this._visualFrames;
  }

  protected _visualFrames: number = 0;

  private _onChangeSubscriptions: (() => void)[] = [];

  public addVisualFrames(amount: number) {
    this._visualFrames += amount;
    this._notifyChanges();
  }

  public removeVisualFrames(amount: number = this._visualFrames) {
    this._visualFrames -= amount;
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
      addVisualFrames(amount: number) {
        block._visualFrames += amount;
        return this;
      },
      build: () => block
    };
  }
}

export abstract class BlockWithActions extends BaseBlock {
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

  public addVisualFrames(amount: number) {
    this.addVirtualFrames(amount);
  }

  public addVirtualFrames(amount: number) {
    this._virtualFrames += amount;
    this._notifyChanges();
  }

  public removeVisualFrames(amount: number = this._visualFrames) {
    this.removeVirtualFrames(amount);
  }

  public removeVirtualFrames(amount: number = this._visualFrames) {
    this._virtualFrames -= amount;
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

  protected static BlockWithActionsBuilder(block: BlockWithActions) {
    return {
      ...BaseBlock.BaseBuilder(block),
      addVisualFrames(amount: number) {
        return this.addVirtualFrames(amount);
      },
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

export class ImageBlock extends BlockWithActions {
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
      ...BlockWithActions.BlockWithActionsBuilder(block),
      withImage(imageSrc: string) { block._imageSrc = imageSrc; return this; }
    };
  }
}

export class ClearBlock extends BlockWithActions {
  public readonly type: BlockType.Clear = BlockType.Clear;

  public replaceAction<T extends TimelineAction>(actionToReplace: T, replacement: T) {
    this._actions.splice(this._actions.indexOf(actionToReplace), 1, replacement);
    this._notifyChanges();
  }

  public static Builder() {
    return BlockWithActions.BlockWithActionsBuilder(new ClearBlock());
  }
}

export class NothingnessBlock extends BaseBlock {
  public readonly type: BlockType.Nothingness = BlockType.Nothingness;

  public static Builder() {
    return BaseBlock.BaseBuilder(new NothingnessBlock());
  }
}

export type BlocksWithActions = ImageBlock | ClearBlock;
export type Block = BlocksWithActions | NothingnessBlock;
export const BlocksFilter = {
  isWithActions(block: Block): block is BlocksWithActions {
    return block.type === BlockType.Clear || block.type === BlockType.Image
  },
  isImage(block: Block): block is ImageBlock {
    return block.type === BlockType.Image
  },
  isNothingness(block: Block): block is NothingnessBlock {
    return block.type === BlockType.Nothingness
  }
};
