import { Animator, Timeline } from 'pran-animation-frontend';
import { TimelineBar } from '../../timeline/timeline-bar';
import { EditorAction, noop } from '../editor-queue';
import { splitBlock } from './split-block';

export function splitInTimeline(animator: Animator, timeline: Timeline, timelineBar: TimelineBar, frame: number): EditorAction {
  const block = timelineBar.findBlockAtFrame(frame);

  if (!block) {
    console.warn('Cannot split where there is no block');
    return noop('Split block (Invalid)');
  }

  return splitBlock(animator, timeline, timelineBar, block, frame);
}