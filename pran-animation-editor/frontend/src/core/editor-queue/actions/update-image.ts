import { ActionType, Animator, Timeline, TimelineAction } from 'pran-animation-frontend';
import { Block, BlocksFilter } from '../../block/block';
import { EditorAction, noop } from '../editor-queue';

export function updateImage(animator: Animator, timeline: Timeline, block: Block, imageId: string, image: HTMLImageElement): EditorAction {
  if (!BlocksFilter.isImage(block)) {
    console.warn('Cannot update image of a non image block');
    return noop('Update image (Invalid)');
  }

  const actionToReplace = block.actions[0],
    replacement: TimelineAction = { type: ActionType.Draw, image: image, metadata: { id: imageId } };

  return {
    name: 'Update image',
    do() {
      animator.replaceTimelineAction(timeline, actionToReplace, replacement);
    },
    undo() {
      animator.replaceTimelineAction(timeline, replacement, actionToReplace);
    }
  };
}