import { ActionType, Animator, NoneAction, Timeline, TimelineAction } from 'pran-animation-frontend';
import { inlineComponent } from '../../framework/inline-component';
import { onClick } from '../../framework/on-click';
import { EditorAction, EditorDoActionEvent } from '../../memento/editor-actions-memento';
import { Mediator } from '../../services/mediator';
import { BlockSelected, BlockUnselected, TimelineBar } from '../timeline-bar/timeline-bar';
import { Block, BlockType } from '../timeline-block/timeline-block';
import './block-editor.css';
import { clearBlock, expandBlock, expandBlockLeft, reduceBlock, reduceBlockLeft, removeBlock } from './editor-actions';

export const createBlockEditor = inlineComponent(controls => {
  let block: Block,
    animator: Animator,
    timeline: Timeline,
    timelineBar: TimelineBar;

  controls.setup('block-editor', 'block-editor');
  Mediator.onEvent<BlockSelected>('blockSelected', e => {
    console.log('Selected:', e.block);
    ({ block, animator, timeline, timelineBar } = e);
    controls.changed();
  });
  Mediator.onEvent<BlockUnselected>('blockUnselected', e => {
    if (e.block === block) {
      console.log('Unselected:', e.block);
      block = null;
      controls.changed();
    }
  });
  
  return () => !block ? `<span></span>` : [`
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
  </div>
</div>
`, e => (
  onClick(e, '.block-editor_left-controls .block-editor_left-arrow', emit(expandBlockLeft, animator, timeline, block, timelineBar)),
  onClick(e, '.block-editor_left-controls .block-editor_right-arrow', emit(reduceBlockLeft, animator, timeline, block, timelineBar)),
  onClick(e, '.block-editor_right-controls .block-editor_right-arrow', emit(expandBlock, animator, timeline, block, timelineBar)),
  onClick(e, '.block-editor_right-controls .block-editor_left-arrow', emit(reduceBlock, animator, timeline, block)),
  onClick(e, '.block-editor_remove', emit(removeBlock, animator, timeline, block)),
  onClick(e, '.block-editor_clear', emit(clearBlock, animator, timeline, block, timelineBar))
  )];
});

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