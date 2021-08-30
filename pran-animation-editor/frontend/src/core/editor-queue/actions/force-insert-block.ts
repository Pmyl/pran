import { Animator, Timeline } from 'pran-animation-frontend';
import { BlockWithActions } from '../../block/block';
import { TimelineBar } from '../../timeline/timeline-bar';
import { combine, EditorAction } from '../editor-queue';
import { insertBlock } from './insert-block';
import { splitInTimeline } from './split-in-timeline';

export function forceInsertBlock(animator: Animator, timeline: Timeline, block: BlockWithActions, timelineBar: TimelineBar, frame: number): EditorAction {
  return combine(
    'Insert block',
    splitInTimeline(animator, timeline, timelineBar, frame),
    insertBlock(animator, timeline, block, frame)
  );
}