import './block-editor.css';

import { ActionType, Animator, AnimatorManager, Timeline } from 'pran-animation-frontend';
import { Block, BlocksFilter, BlockType, ImageBlock } from '../../../core/block/block';
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
    ${BlocksFilter.isWithActions(block) && block.actions[0].metadata && renderMetadata(block.actions[0].metadata) || ''}
  </dl>
  <div class="block-editor_buttons-container">
    <div class="block-editor_block-buttons-container">
      <button class="block-editor_remove g-button g-button-s" type="button">Remove</button>
      <button class="block-editor_clear g-button g-button-s" type="button">Clear</button>
      <button class="block-editor_split g-button g-button-s" type="button">Split</button>
      <button class="block-editor_insert-draw g-button g-button-s" type="button">Insert image</button>
    </div>
    <div class="block-editor_timeline-buttons-container">
      <p class="block-editor_timeline-buttons-label">Timeline</p>
      <button class="block-editor_add-timeline g-button g-button-icon-s" type="button">
        <img alt="Add timeline" src="data:image/svg+xml;base64,PHN2ZyBoZWlnaHQ9JzMwMHB4JyB3aWR0aD0nMzAwcHgnICBmaWxsPSIjMDAwMDAwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB4bWw6c3BhY2U9InByZXNlcnZlIiB2ZXJzaW9uPSIxLjEiIHN0eWxlPSJzaGFwZS1yZW5kZXJpbmc6Z2VvbWV0cmljUHJlY2lzaW9uO3RleHQtcmVuZGVyaW5nOmdlb21ldHJpY1ByZWNpc2lvbjtpbWFnZS1yZW5kZXJpbmc6b3B0aW1pemVRdWFsaXR5OyIgdmlld0JveD0iMCAwIDYyNiA2MjYiIHg9IjBweCIgeT0iMHB4IiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCI+PGRlZnM+PHN0eWxlIHR5cGU9InRleHQvY3NzIj4KICAgCiAgICAuZmlsMCB7ZmlsbDojMDAwMDAwfQogICAKICA8L3N0eWxlPjwvZGVmcz48Zz48cGF0aCBjbGFzcz0iZmlsMCIgZD0iTTMxMyAwYzI5LDAgNTMsMjQgNTMsNTNsMCAyMDcgMjA3IDBjMjksMCA1MywyNCA1Myw1MyAwLDI5IC0yNCw1MyAtNTMsNTNsLTIwNyAwIDAgMjA3YzAsMjkgLTI0LDUzIC01Myw1MyAtMjksMCAtNTMsLTI0IC01MywtNTNsMCAtMjA3IC0yMDcgMGMtMjksMCAtNTMsLTI0IC01MywtNTMgMCwtMjkgMjQsLTUzIDUzLC01M2wyMDcgMCAwIC0yMDdjMCwtMjkgMjQsLTUzIDUzLC01M3oiPjwvcGF0aD48L2c+PC9zdmc+" />
      </button>
      <button class="block-editor_remove-timeline g-button g-button-icon-s g-button-negative" type="button">
        <img alt="Remove timeline" src="data:image/svg+xml;base64,PHN2ZyBoZWlnaHQ9JzMwMHB4JyB3aWR0aD0nMzAwcHgnICBmaWxsPSIjMDAwMDAwIiB4bWxuczp4PSJodHRwOi8vbnMuYWRvYmUuY29tL0V4dGVuc2liaWxpdHkvMS4wLyIgeG1sbnM6aT0iaHR0cDovL25zLmFkb2JlLmNvbS9BZG9iZUlsbHVzdHJhdG9yLzEwLjAvIiB4bWxuczpncmFwaD0iaHR0cDovL25zLmFkb2JlLmNvbS9HcmFwaHMvMS4wLyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgdmVyc2lvbj0iMS4xIiB4PSIwcHgiIHk9IjBweCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDEwMCAxMDA7IiB4bWw6c3BhY2U9InByZXNlcnZlIj48c3dpdGNoPjxmb3JlaWduT2JqZWN0IHJlcXVpcmVkRXh0ZW5zaW9ucz0iaHR0cDovL25zLmFkb2JlLmNvbS9BZG9iZUlsbHVzdHJhdG9yLzEwLjAvIiB4PSIwIiB5PSIwIiB3aWR0aD0iMSIgaGVpZ2h0PSIxIj48L2ZvcmVpZ25PYmplY3Q+PGcgaTpleHRyYW5lb3VzPSJzZWxmIj48Zz48cGF0aCBkPSJNODcsMTUuOUg2Ni45VjYuN2MwLTIuMy0xLjktNC4yLTQuMi00LjJIMzcuM2MtMi4zLDAtNC4yLDEuOS00LjIsNC4ydjkuMkgxM2MtMi4zLDAtNC4yLDEuOS00LjIsNC4yczEuOSw0LjIsNC4yLDQuMmg3NCAgICAgYzIuMywwLDQuMi0xLjksNC4yLTQuMlM4OS40LDE1LjksODcsMTUuOXogTTQxLjUsMTFoMTYuOXY1SDQxLjVWMTF6Ij48L3BhdGg+PHBhdGggZD0iTTE4LjksODUuM2MwLDYuNyw1LjUsMTIuMiwxMi4yLDEyLjJoMzcuOGM2LjcsMCwxMi4yLTUuNSwxMi4yLTEyLjJWMjkuN0gxOC45Vjg1LjN6IE02Mi41LDQ1YzAtMS42LDEuMy0yLjgsMi44LTIuOCAgICAgYzEuNiwwLDIuOCwxLjMsMi44LDIuOHYzNy4yYzAsMS42LTEuMywyLjgtMi44LDIuOGMtMS42LDAtMi44LTEuMy0yLjgtMi44VjQ1eiBNNDcuMiw0NWMwLTEuNiwxLjMtMi44LDIuOC0yLjggICAgIGMxLjYsMCwyLjgsMS4zLDIuOCwyLjh2MzcuMmMwLDEuNi0xLjMsMi44LTIuOCwyLjhjLTEuNiwwLTIuOC0xLjMtMi44LTIuOFY0NXogTTMxLjksNDVjMC0xLjYsMS4zLTIuOCwyLjgtMi44ICAgICBjMS42LDAsMi44LDEuMywyLjgsMi44djM3LjJjMCwxLjYtMS4zLDIuOC0yLjgsMi44Yy0xLjYsMC0yLjgtMS4zLTIuOC0yLjhWNDV6Ij48L3BhdGg+PC9nPjwvZz48L3N3aXRjaD48L3N2Zz4=" />
      </button>
    </div>
  </div>
</div>
`, e => (
  onClick(e, '.block-editor_remove', emit(removeBlock, inputs.animator, timeline, block)),
  onClick(e, '.block-editor_clear', emit(clearBlock, inputs.animator, timeline, block, timelineBar)),
  onClick(e, '.block-editor_split', () => emit(splitBlock, inputs.animator, timeline, timelineBar, block, timelinePosition)()),
  onClick(e, '.block-editor_add-timeline', emit(addTimeline, inputs.animator)),
  onClick(e, '.block-editor_remove-timeline', emit(removeTimeline, inputs.animator, timeline)),
  onClick(e, '.block-editor_insert-draw', () => openInsertImageModal(inputs.animatorManager, inputs.animator, timeline, timelineBar, timelinePosition)),
  block.type === BlockType.Image && onClick(e, '.block-editor_block', () => openChangeImageModal(inputs.animatorManager, inputs.animator, timeline, block))
  )];
});

function renderMetadata(metadata: { [p: string]: any }) {
  return Object.keys(metadata).map(k => `
    <dt>${k}</dt>
    <dd>${metadata[k]}</dd>
`).join('');
}

function openChangeImageModal(animatorManager: AnimatorManager, animator: Animator, timeline: Timeline, block: Block) {
  Modal.open(createSelectImageModal({ animatorManager })).then(value => {
    value && emit(updateImage, animator, timeline, block, value[1])();
  });
}

function openInsertImageModal(animatorManager: AnimatorManager, animator: Animator, timeline: Timeline, timelineBar: TimelineBar, timelinePosition: number) {
  Modal.open(createSelectImageModal({ animatorManager })).then(value => {
    if (!value) return;

    let blockToInsert = ImageBlock
      .Builder()
      .addAction({ type: ActionType.Draw, image: value[1] })
      .addAction({ type: ActionType.None, amount: 4 })
      .build();

    emit(forceInsertBlock, animator, timeline, blockToInsert, timelineBar, timelinePosition)();
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