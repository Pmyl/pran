import {
  ActionType,
  ClearAction,
  DrawAction,
  NoneAction,
  TimelineAction,
  TimelineChangeType
} from 'pran-animation-frontend';
import { BlockType, BlockWithActions } from '../block/block';
import { TimelineBar } from './timeline-bar';

const draw = (id: string): DrawAction => ({ type: ActionType.Draw, image: { id } as HTMLImageElement });
const clear = (): ClearAction => ({ type: ActionType.Clear });
const wait = (amount: number): NoneAction => ({ type: ActionType.None, amount });

describe('timeline-bar', () => {
  it('should generate based on actions and expand last block virtual frames', () => {
    const bar = new TimelineBar();

    bar.regenerate([
      draw('1'),
      wait(10),
      draw('2'),
      wait(20)
    ], 100);

    expect(bar.blocks[0].type).toBe(BlockType.Image);
    expect(bar.blocks[0].visualFrames).toBe(11);
    expect((bar.blocks[0] as BlockWithActions).frames).toBe(11);

    expect(bar.blocks[1].type).toBe(BlockType.Image);
    expect(bar.blocks[1].visualFrames).toBe(100 - 11);
    expect((bar.blocks[1] as BlockWithActions).frames).toBe(21);
  });

  it('should insert block after last block', () => {
    const bar = new TimelineBar();

    bar.regenerate([
      draw('1'),
      wait(10),
      draw('2'),
      wait(20)
    ], 100);

    bar.updateBlocks({ type: TimelineChangeType.InsertAction, frame: 32, action: draw('3') });

    expect(bar.blocks[0].type).toBe(BlockType.Image);
    expect(bar.blocks[0].visualFrames).toBe(11);

    expect(bar.blocks[1].type).toBe(BlockType.Image);
    expect(bar.blocks[1].visualFrames).toBe(21);

    expect(bar.blocks[2].type).toBe(BlockType.Image);
    expect(bar.blocks[2].visualFrames).toBe(1);
  });

  it('should expand last block through virtual frames', () => {
    const bar = new TimelineBar();

    const lastWaitAction = wait(20);

    bar.regenerate([
      draw('1'),
      wait(10),
      draw('2'),
      lastWaitAction
    ], 100);

    lastWaitAction.amount += 10;
    bar.updateBlocks({ type: TimelineChangeType.ExpandAction, amount: 10, action: lastWaitAction });
    bar.adaptToTotalFrames(100);

    expect(bar.blocks[0].type).toBe(BlockType.Image);
    expect(bar.blocks[0].visualFrames).toBe(11);

    expect(bar.blocks[1].type).toBe(BlockType.Image);
    expect(bar.blocks[1].visualFrames).toBe(100 - 11);
    expect((bar.blocks[1] as BlockWithActions).frames).toBe(21 + 10);
  });

  it('should find block before frame when last', () => {
    const bar = new TimelineBar();

    bar.regenerate([
      draw('1'),
      wait(10),
      draw('2'),
      wait(20)
    ], 100);
    
    expect(bar.findBlockBeforeFrame(32)).toBe(bar.blocks[1]);
  });
});