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
  </div>
</div>
`, e => (
  onClick(e, '.block-editor_add-timeline', emit(addTimeline, inputs.animator))
)] : [`
<div class="block-editor_container">
  <div class="block-editor_block-container">
    <div class="block-editor_block">
      ${createThumbnailHTML(block)}
    </div>
    <div class="block-editor_block-buttons-container">
      <button title="Clear block" class="block-editor_clear g-button g-button-icon-s" type="button">
        <img alt="Clear block" src="data:image/svg+xml;base64,PHN2ZyBoZWlnaHQ9JzMwMHB4JyB3aWR0aD0nMzAwcHgnICBmaWxsPSIjMDAwMDAwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2ZXJzaW9uPSIxLjAiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgMjQgMjQiIGVuYWJsZS1iYWNrZ3JvdW5kPSJuZXcgMCAwIDI0IDI0IiB4bWw6c3BhY2U9InByZXNlcnZlIj48cGF0aCBkPSJNMTMuMiwzLjVMOCw4LjdsNy4yLDcuMmw1LjItNS4yYzAuNy0wLjcsMC43LTEuOSwwLTIuNmwtNC42LTQuNkMxNS4xLDIuOCwxMy45LDIuOCwxMy4yLDMuNXoiPjwvcGF0aD48cGF0aCBmaWxsPSJub25lIiBzdHJva2U9IiMwMDAwMDAiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLW1pdGVybGltaXQ9IjEwIiBkPSJNMTEuMywyMGw5LjItOS4yICBjMC43LTAuNywwLjctMS45LDAtMi42bC00LjYtNC42Yy0wLjctMC43LTEuOS0wLjctMi42LDBsLTkuNyw5LjdjLTAuNywwLjctMC43LDEuOSwwLDIuNkw3LjcsMjBsMCwwSDIyIj48L3BhdGg+PC9zdmc+" />
      </button>
      <button title="Split block" class="block-editor_split g-button g-button-icon-s" type="button">
        <img alt="Split block" src="data:image/svg+xml;base64,PHN2ZyBoZWlnaHQ9JzMwMHB4JyB3aWR0aD0nMzAwcHgnICBmaWxsPSIjMDAwMDAwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2ZXJzaW9uPSIxLjEiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgNjYgNjYiIGVuYWJsZS1iYWNrZ3JvdW5kPSJuZXcgMCAwIDY2IDY2IiB4bWw6c3BhY2U9InByZXNlcnZlIj48Zz48Zz48Zz48cGF0aCBkPSJNNTYuNzU1MDA0OSw0OC40NzAzNzEyYy0yLjMyOTk1NjEtNC4wMzk5NzgtNi4zNTk5ODU0LTYuNjU5OTczMS0xMC4yNzk5MDcyLTYuNjU5OTczMSAgICAgYy0xLjQyMDE2NiwwLTIuNzYwMDA5OCwwLjMzOTk2NTgtMy45NTAwNzMyLDEuMDEwMDA5OEwxOC43NTUwMDQ5LDEuNjMwNDA0NCAgICAgYy0wLjIwOTk2MDktMC4zNjAwNDY0LTAuNjcwMDQzOS0wLjQ4OTk5MDItMS4wMjk5MDcyLTAuMjgwMDI5M2MtMi4wOTAwODc5LDEuMjAwMDEyMy0zLjU5MDA4NzksMy4xNTAwMjQ0LTQuMjIwMDkyOCw1LjQ4OTk5MDIgICAgIGMtMC42MzAwMDQ5LDIuMzMwMDE3MS0wLjMwOTkzNjUsNC43NjAwMDk4LDAuOTAwMDI0NCw2Ljg2MDA0NjRsMjYuMTk5OTUxMiw0NS4zOTk5NjM0ICAgICBjMC4wNjAwNTg2LDAuMTAwMDM2NiwwLjE2MDAzNDIsMC4xNzk5OTI3LDAuMjcwMDE5NSwwLjIzOTk5MDJjMi4zOTAwMTQ2LDMuMzQwMDI2OSw2LDUuNDEwMDMwNCw5LjQ3OTk4MDUsNS40MTAwMzA0ICAgICBjMS40Njk5NzA3LDAsMi44MzAwNzgxLTAuMzU5OTg1NCw0LjA2MDA1ODYtMS4wNzAwMDM1YzEuODk5OTAyMy0xLjA5MDAyNjksMy4yOTAwMzkxLTIuOTcwMDMxNywzLjkwOTkxMjEtNS4yODk5NzggICAgIEM1OS4xNjUwMzkxLDU1LjI2MDQxMDMsNTguNTk0OTcwNyw1MS42NDA0MTUyLDU2Ljc1NTAwNDksNDguNDcwMzcxMnogTTMzLjgyNDk1MTIsMzkuNTUwMzg4MyAgICAgYy0xLjE0OTkwMjMsMC0yLjA5OTg1MzUtMC45NTAwMTIyLTIuMDk5ODUzNS0yLjExOTk5NTFjMC0xLjE2MDAzNDIsMC45NDk5NTEyLTIuMTA5OTg1NCwyLjA5OTg1MzUtMi4xMDk5ODU0ICAgICBjMS4xNzAwNDM5LDAsMi4xMjAxMTcyLDAuOTQ5OTUxMiwyLjEyMDExNzIsMi4xMDk5ODU0QzM1Ljk0NTA2ODQsMzguNjAwMzc2MSwzNC45OTQ5OTUxLDM5LjU1MDM4ODMsMzMuODI0OTUxMiwzOS41NTAzODgzeiAgICAgIE01MS40NDUwNjg0LDU4LjU0MDM3ODZjLTEuMzYwMTA3NCwwLjc4MDAyOTMtNC4wMjAwMTk1LTAuMTU5OTczMS01LjgzMDA3ODEtMi43OTk5ODc4ICAgICBjLTAuMTg5OTQxNC0wLjI3MDAxOTUtMC4yOTAwMzkxLTAuNDQwMDAyNC0wLjM4OTg5MjYtMC42MDk5ODU0Yy0xLjcwMDA3MzItMi45NDAwMDI0LTEuMzUwMDk3Ny02LjA0OTk4NzgsMC4wMTk4OTc1LTcuMDEwMDA5OCAgICAgYzAsMCwwLjA2OTk0NjMtMC4wNDk5ODc4LDAuMTMwMDA0OS0wLjA5MDAyNjljMS41MjAwMTk1LTAuODY5OTk1MSw0LjUsMC40MTAwMzQyLDYuMjM5OTkwMiwzLjQxMDAzNDIgICAgIEM1My4zMzQ5NjA5LDU0LjQ0MDQwMyw1Mi45NTUwNzgxLDU3LjY3MDM4MzUsNTEuNDQ1MDY4NCw1OC41NDAzNzg2eiI+PC9wYXRoPjwvZz48L2c+PGc+PGc+PHBhdGggZD0iTTI2LjQ3NTA5NzcsMzcuNjIwMzk1N2wtMyw1LjIwMDAxMjJjLTEuMjAwMDczMi0wLjY3MDA0MzktMi41MzAwMjkzLTEuMDEwMDA5OC0zLjk2MDA4My0xLjAxMDAwOTggICAgIGMtMy45MTAwMzQyLDAtNy45NDAwNjM1LDIuNjE5OTk1MS0xMC4yNzAwMTk1LDYuNjU5OTczMWMtMS44Mzk5NjU4LDMuMTcwMDQzOS0yLjQxMDAzNDIsNi43OTAwMzkxLTEuNTY5OTQ2Myw5LjkyMDA0MzkgICAgIGMwLjYxOTk5NTEsMi4zMTk5NDYzLDIuMDEwMDA5OCw0LjE5OTk1MTIsMy45MDk5MTIxLDUuMjg5OTc4YzEuMjI5OTgwNSwwLjcxMDAxODIsMi41OTAwODc5LDEuMDcwMDAzNSw0LjA2MDA1ODYsMS4wNzAwMDM1ICAgICBjMy40NTk5NjA5LDAsNy4wNTAwNDg4LTIuMDQ5OTg0LDkuNDQ5OTUxMi01LjM2OTk5MTNjMC4xMjAxMTcyLTAuMDU5OTk3NiwwLjIxOTk3MDctMC4xNjAwMzQyLDAuMzAwMDQ4OC0wLjI4MDAyOTMgICAgIGw2LjczOTk5MDItMTEuNjY5OTgyOUwyNi40NzUwOTc3LDM3LjYyMDM5NTd6IE0yMC43ODUwMzQyLDU1LjEzMDQwNTQgICAgIGMtMC4wOTk5NzU2LDAuMTY5OTgyOS0wLjIxMDA4MywwLjMzOTk2NTgtMC40MDAwMjQ0LDAuNjA5OTg1NGMtMS44MTAwNTg2LDIuNjQwMDE0Ni00LjQ3OTk4MDUsMy41ODAwMTcxLTUuODMwMDc4MSwyLjc5OTk4NzggICAgIGMtMS41MDk4ODc3LTAuODY5OTk1MS0xLjg5OTkwMjMtNC4wODk5NjU4LTAuMTU5OTEyMS03LjA5OTk3NTZjMS43Mjk5ODA1LTMuMDEwMDA5OCw0LjcxOTk3MDctNC4yODAwMjkzLDYuMjE5OTcwNy0zLjQxMDAzNDIgICAgIGMwLjA3MDA2ODQsMC4wNDAwMzkxLDAuMTQwMDE0NiwwLjA5MDAyNjksMC4xNDAwMTQ2LDAuMDkwMDI2OUMyMi4xMjUsNDkuMDgwNDE3NiwyMi40NzUwOTc3LDUyLjE5MDQwMywyMC43ODUwMzQyLDU1LjEzMDQwNTR6Ij48L3BhdGg+PC9nPjxnPjxwYXRoIGQ9Ik01MS41OTQ5NzA3LDEzLjcwMDQxMThMMzkuNTI1MDI0NCwzNC42MjAzOTU3bC01LjY2MDAzNDItOS44MDk5OTk1TDQ3LjI0NDk5NTEsMS42MzA0MDQ0ICAgICBjMC4yMTAwODMtMC4zNjAwNDY0LDAuNjcwMDQzOS0wLjQ4OTk5MDIsMS4wMjAwMTk1LTAuMjgwMDI5M2MyLjA5OTk3NTYsMS4yMDAwMTIzLDMuNTk5OTc1NiwzLjE1MDAyNDQsNC4yMjk5ODA1LDUuNDg5OTkwMiAgICAgQzUzLjEyNSw5LjEyMDM5NDcsNTIuNzk1MDQzOSwxMS42MjAzOTQ3LDUxLjU5NDk3MDcsMTMuNzAwNDExOHoiPjwvcGF0aD48L2c+PC9nPjwvZz48L3N2Zz4=" />
      </button>
      <button title="Remove block" class="block-editor_remove g-button g-button-icon-s g-button-negative" type="button">
        <img alt="Remove block" src="data:image/svg+xml;base64,PHN2ZyBoZWlnaHQ9JzMwMHB4JyB3aWR0aD0nMzAwcHgnICBmaWxsPSIjMDAwMDAwIiB4bWxuczp4PSJodHRwOi8vbnMuYWRvYmUuY29tL0V4dGVuc2liaWxpdHkvMS4wLyIgeG1sbnM6aT0iaHR0cDovL25zLmFkb2JlLmNvbS9BZG9iZUlsbHVzdHJhdG9yLzEwLjAvIiB4bWxuczpncmFwaD0iaHR0cDovL25zLmFkb2JlLmNvbS9HcmFwaHMvMS4wLyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgdmVyc2lvbj0iMS4xIiB4PSIwcHgiIHk9IjBweCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDEwMCAxMDA7IiB4bWw6c3BhY2U9InByZXNlcnZlIj48c3dpdGNoPjxmb3JlaWduT2JqZWN0IHJlcXVpcmVkRXh0ZW5zaW9ucz0iaHR0cDovL25zLmFkb2JlLmNvbS9BZG9iZUlsbHVzdHJhdG9yLzEwLjAvIiB4PSIwIiB5PSIwIiB3aWR0aD0iMSIgaGVpZ2h0PSIxIj48L2ZvcmVpZ25PYmplY3Q+PGcgaTpleHRyYW5lb3VzPSJzZWxmIj48Zz48cGF0aCBkPSJNODcsMTUuOUg2Ni45VjYuN2MwLTIuMy0xLjktNC4yLTQuMi00LjJIMzcuM2MtMi4zLDAtNC4yLDEuOS00LjIsNC4ydjkuMkgxM2MtMi4zLDAtNC4yLDEuOS00LjIsNC4yczEuOSw0LjIsNC4yLDQuMmg3NCAgICAgYzIuMywwLDQuMi0xLjksNC4yLTQuMlM4OS40LDE1LjksODcsMTUuOXogTTQxLjUsMTFoMTYuOXY1SDQxLjVWMTF6Ij48L3BhdGg+PHBhdGggZD0iTTE4LjksODUuM2MwLDYuNyw1LjUsMTIuMiwxMi4yLDEyLjJoMzcuOGM2LjcsMCwxMi4yLTUuNSwxMi4yLTEyLjJWMjkuN0gxOC45Vjg1LjN6IE02Mi41LDQ1YzAtMS42LDEuMy0yLjgsMi44LTIuOCAgICAgYzEuNiwwLDIuOCwxLjMsMi44LDIuOHYzNy4yYzAsMS42LTEuMywyLjgtMi44LDIuOGMtMS42LDAtMi44LTEuMy0yLjgtMi44VjQ1eiBNNDcuMiw0NWMwLTEuNiwxLjMtMi44LDIuOC0yLjggICAgIGMxLjYsMCwyLjgsMS4zLDIuOCwyLjh2MzcuMmMwLDEuNi0xLjMsMi44LTIuOCwyLjhjLTEuNiwwLTIuOC0xLjMtMi44LTIuOFY0NXogTTMxLjksNDVjMC0xLjYsMS4zLTIuOCwyLjgtMi44ICAgICBjMS42LDAsMi44LDEuMywyLjgsMi44djM3LjJjMCwxLjYtMS4zLDIuOC0yLjgsMi44Yy0xLjYsMC0yLjgtMS4zLTIuOC0yLjhWNDV6Ij48L3BhdGg+PC9nPjwvZz48L3N3aXRjaD48L3N2Zz4=" />
      </button>
    </div>
  </div>
  <dl>
    <dt>Frames</dt>
    <dd>${block.visualFrames}</dd>
    ${BlocksFilter.isWithActions(block) && block.actions[0].metadata && renderMetadata(block.actions[0].metadata) || ''}
  </dl>
  <div class="block-editor_buttons-container">
    <div class="block-editor_block-buttons-container">
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