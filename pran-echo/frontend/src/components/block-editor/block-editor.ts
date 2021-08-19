import { Animator, AnimatorManager, Timeline } from 'pran-animation-frontend';
import { inlineComponent } from '../../framework/inline-component';
import { onClick } from '../../framework/on-click';
import { EditorAction, EditorDoActionEvent } from '../../editor-queue/editor-queue';
import { Mediator } from '../../services/mediator';
import { Modal } from '../../services/modal';
import { createSelectImageModal } from '../select-image-modal/select-image-modal';
import { BlockSelected, BlockUnselected, TimelineBar } from '../timeline-bar/timeline-bar';
import { Block, BlockType } from '../timeline-block/timeline-block';
import './block-editor.css';
import { TimelinePositionChanged } from '../timeline-board/timeline-board';
import {
  clearBlock,
  expandBlock,
  expandBlockLeft,
  reduceBlock,
  reduceBlockLeft,
  removeBlock,
  splitBlock, updateImage
} from './editor-actions';

export const createBlockEditor = inlineComponent<{ animatorManager: AnimatorManager }>(controls => {
  let block: Block,
    animator: Animator,
    timeline: Timeline,
    timelineBar: TimelineBar,
    timelinePosition: number = 0,
    unsubscribeChanges: () => void;

  controls.setup('block-editor', 'block-editor');
  Mediator.onEvent<BlockSelected>('blockSelected', e => {
    unsubscribeChanges?.();
    ({ block, animator, timeline, timelineBar } = e);
    unsubscribeChanges = block.onChange(controls.changed);
    controls.changed();
  });
  Mediator.onEvent<BlockUnselected>('blockUnselected', e => {
    if (e.block === block) {
      console.log('Unselected:', e.block);
      unsubscribeChanges?.();
      block = null;
      controls.changed();
    }
  });
  Mediator.onEvent<TimelinePositionChanged>('timelinePositionChanged', newPosition => {
    timelinePosition = newPosition;
  });
  
  return inputs => !block ? `<span></span>` : [`
<div class="block-editor_container">
  <div class="block-editor_block-container">
    <div class="block-editor_controls-container">
      <div class="block-editor_left-controls">
        <button type="button" class="block-editor_left-arrow"></button>
        <button type="button" class="block-editor_handle"></button>    
        <button type="button" class="block-editor_right-arrow"></button>
      </div>
      <div class="block-editor_right-controls">
        <button type="button" class="block-editor_left-arrow"></button>
        <button type="button" class="block-editor_handle"></button>    
        <button type="button" class="block-editor_right-arrow"></button>
      </div>
    </div>
    <div class="block-editor_block">
      ${createThumbnailHTML(block)}
    </div>
  </div>
  <div class="block-editor_buttons-container">
    <button class="block-editor_remove" type="button">Remove</button>
    <button class="block-editor_clear" type="button">Clear</button>
    <button class="block-editor_split" type="button">Split</button>
    <button class="block-editor_update-image" type="button">Update image</button>
  </div>
</div>
`, e => (
  onClick(e, '.block-editor_left-controls .block-editor_left-arrow', emit(expandBlockLeft, animator, timeline, block, timelineBar)),
  onClick(e, '.block-editor_left-controls .block-editor_right-arrow', emit(reduceBlockLeft, animator, timeline, block, timelineBar)),
  onClick(e, '.block-editor_right-controls .block-editor_right-arrow', emit(expandBlock, animator, timeline, block, timelineBar)),
  onClick(e, '.block-editor_right-controls .block-editor_left-arrow', emit(reduceBlock, animator, timeline, block)),
  onClick(e, '.block-editor_remove', emit(removeBlock, animator, timeline, block)),
  onClick(e, '.block-editor_clear', emit(clearBlock, animator, timeline, block, timelineBar)),
  onClick(e, '.block-editor_split', () => emit(splitBlock, animator, timeline, block, timelineBar, timelinePosition)()),
  onClick(e, '.block-editor_update-image', () => openModal(inputs.animatorManager, animator, timeline, block))
  )];
});

function openModal(animatorManager: AnimatorManager, animator: Animator, timeline: Timeline, block: Block) {
  Modal.open(createSelectImageModal({ animatorManager })).then(value => {
    value && emit(updateImage, animator, timeline, block, value[1])();
  });
}

function emit<T extends (...args: any[]) => EditorAction>(func: T, ...params: Parameters<T>): () => void {
  return () => Mediator.raiseEvent<EditorDoActionEvent>('doEditorAction', func(...params));
}

function createThumbnailHTML(block: Block): string {
  if (block.type === BlockType.Image) {
    return `<img
        class = "block-editor_draw-thumbnail"
        alt = "draw block image"
        src = "${block.imageSrc}" / >`
  }

  return `<img
        class = "block-editor_clear-thumbnail"
        alt = "clear block image"
        src = "./resources/clear.png" / >`
}