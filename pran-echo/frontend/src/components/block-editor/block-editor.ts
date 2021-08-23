import { Animator, AnimatorManager, Timeline } from 'pran-animation-frontend';
import { inlineComponent } from '../../framework/inline-component';
import { onChange } from '../../framework/on-change';
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
    <div class="block-editor_block">
      ${createThumbnailHTML(block)}
    </div>
  </div>
  <dl>
    <dt>Frames</dt>
    <dd>${block.visualFrames}</dd>
  </dl>
  <div class="block-editor_buttons-container">
    <button class="block-editor_remove" type="button">Remove</button>
    <button class="block-editor_clear" type="button">Clear</button>
    <button class="block-editor_split" type="button">Split</button>
    <input type="file" id="upload_audio_input" hidden />
    <button class="block-editor_upload_audio" type="button">Upload audio</button>
  </div>
</div>
`, e => (
  onClick(e, '.block-editor_remove', emit(removeBlock, animator, timeline, block)),
  onClick(e, '.block-editor_clear', emit(clearBlock, animator, timeline, block, timelineBar)),
  onClick(e, '.block-editor_split', () => emit(splitBlock, animator, timeline, block, timelineBar, timelinePosition)()),
  onChange(e, "#upload_audio_input", uploadAudio),
  onClick(e, '.block-editor_upload_audio', () => triggerFileBrowse()),
  block.type === BlockType.Image && onClick(e, '.block-editor_block', () => openModal(inputs.animatorManager, animator, timeline, block))
  )];
});

function triggerFileBrowse() {
  document.getElementById("upload_audio_input").click();
}

async function uploadAudio(filesChange) {
  const file = filesChange.target.files[0];
  const formData = new FormData();
  formData.append('recording', file);
  
  const response = await fetch('/api/audio', { method: 'POST', body: formData });

  filesChange.target.value = '';
  console.log(response);
}

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