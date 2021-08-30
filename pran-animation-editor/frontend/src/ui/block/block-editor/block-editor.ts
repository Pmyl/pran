import './block-editor.css';

import { ActionType, Animator, AnimatorManager, Timeline } from 'pran-animation-frontend';
import { Block, BlockType, ImageBlock } from '../../../core/block/block';
import { addTimeline } from '../../../core/editor-queue/actions/add-timeline';
import { clearBlock } from '../../../core/editor-queue/actions/clear-block';
import { forceInsertBlock } from '../../../core/editor-queue/actions/force-insert-block';
import { removeBlock } from '../../../core/editor-queue/actions/remove-block';
import { removeTimeline } from '../../../core/editor-queue/actions/remove-timeline';
import { splitBlock } from '../../../core/editor-queue/actions/split-block';
import { updateImage } from '../../../core/editor-queue/actions/update-image';
import { EditorAction, EditorDoActionEvent } from '../../../core/editor-queue/editor-queue';
import { Mediator } from '../../../core/mediator/mediator';
import { TimelineBar } from '../../../core/timeline/timeline-bar';
import { inlineComponent } from '../../framework/inline-component';
import { onClick } from '../../framework/on-click';
import { Modal } from '../../modal/modal';
import { BlockSelected, BlockUnselected } from '../../timeline/timeline-bar/timeline-bar';
import { TimelinePositionChanged } from '../../timeline/timeline-board/timeline-board';
import { createSelectImageModal } from './select-image-modal/select-image-modal';

export const createBlockEditor = inlineComponent<{ animatorManager: AnimatorManager, animator: Animator }>(controls => {
  let block: Block,
    timeline: Timeline,
    timelineBar: TimelineBar,
    timelinePosition: number = 0,
    unsubscribeChanges: () => void;

  controls.setup('block-editor', 'block-editor');
  Mediator.onEvent<BlockSelected>('blockSelected', e => {
    unsubscribeChanges?.();
    ({ block, timeline, timelineBar } = e);
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
  
  return inputs => !block ? [`
<div class="block-editor_unselected-container">
  <div class="block-editor_unselected-buttons-container">
    <button class="block-editor_add-timeline g-button g-button-s" type="button">Add timeline</button>
    <button class="block-editor_remove-timeline g-button g-button-s" type="button">Remove timeline</button>
  </div>
</div>
`, e => (
  onClick(e, '.block-editor_add-timeline', () => addTimeline(inputs.animator))
)] : [`
<div class="block-editor_container">
  <div class="block-editor_block-container">
    <div class="block-editor_block">
      ${createThumbnailHTML(block)}
    </div>
  </div>
  <dl>
    <dt>Frames</dt>
    <dd>${block.visualFrames}</dd>
  </dl>
  <div class="block-editor_buttons-container">
    <div class="block-editor_block-buttons-container">
      <button class="block-editor_remove g-button g-button-s" type="button">Remove</button>
      <button class="block-editor_clear g-button g-button-s" type="button">Clear</button>
      <button class="block-editor_split g-button g-button-s" type="button">Split</button>
      <button class="block-editor_insert-draw g-button g-button-s" type="button">Insert image</button>
    </div>
    <div class="block-editor_timeline-buttons-container">
      <button class="block-editor_add-timeline g-button g-button-s" type="button">Add timeline</button>
      <button class="block-editor_remove-timeline g-button g-button-s" type="button">Remove timeline</button>
    </div>
  </div>
</div>
`, e => (
  onClick(e, '.block-editor_remove', emit(removeBlock, inputs.animator, timeline, block)),
  onClick(e, '.block-editor_clear', emit(clearBlock, inputs.animator, timeline, block, timelineBar)),
  onClick(e, '.block-editor_split', () => emit(splitBlock, inputs.animator, timeline, timelineBar, block, timelinePosition)()),
  onClick(e, '.block-editor_add-timeline', emit(addTimeline, inputs.animator)),
  onClick(e, '.block-editor_remove-timeline', emit(removeTimeline, inputs.animator, timeline)),
  onClick(e, '.block-editor_insert-draw', () => {
    let blockToInsert = ImageBlock
      .Builder()
      .addAction({ type: ActionType.Draw, image: inputs.animatorManager.imagesMap.values().next().value })
      .build();

    emit(forceInsertBlock, inputs.animator, timeline, blockToInsert, timelineBar, timelinePosition)();
  }),
  block.type === BlockType.Image && onClick(e, '.block-editor_block', () => openModal(inputs.animatorManager, inputs.animator, timeline, block))
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