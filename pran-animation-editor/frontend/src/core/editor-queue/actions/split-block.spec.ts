import { Animator, draw, Timeline, wait } from 'pran-animation-frontend';
import { TimelineBar } from '../../timeline/timeline-bar';
import { EditorAction } from '../editor-queue';
import { splitBlock } from './split-block';

describe('split-block', () => {
  it('should split block in virtual frames by inserting after and expanding', () => {
    const timelineBar = new TimelineBar();
    timelineBar.regenerate([
      draw({} as HTMLImageElement),
      wait(10)
    ], 100);

    const result = splitBlock({} as Animator, {} as Timeline, timelineBar, timelineBar.blocks[0], 30);
    
    expect(result.name).toBe('Split block');
    expect(result.hasOwnProperty('combinedActions')).toBe(true);

    const actions = (result as EditorAction & { combinedActions: EditorAction[] }).combinedActions;
    expect(actions[0].name).toBe('Insert block');
    expect(actions[1].name).toBe(`Expand block of ${30 - 11}`);
  });
});