import './timeline-block.css';
import { inlineComponent } from '../../framework/inline-component';
import { onClick } from '../../framework/on-click';

export enum BlockType {
  Image,
  Clear
}

export interface ImageBlock {
  frames: number;
  type: BlockType.Image;
  imageSrc: string;
}

export interface ClearBlock {
  frames: number;
  type: BlockType.Clear;
}

export type Block = ImageBlock | ClearBlock;

export const createTimelineBlock = inlineComponent<{ block: Block, frameWidth: number }>(controls => {
  controls.setup('timeline-block', 'timeline-block');

  return inputs => controls.mandatoryInput('block') && controls.mandatoryInput('frameWidth') && [`
<div class="timeline-block_block" style="width:${inputs.block.frames * inputs.frameWidth}px">
    ${createThumbnailHTML(inputs.block)}
</div>`, el => onClick(el, '.timeline-block_block', () => console.log('Selected:', inputs.block))];
});

function createThumbnailHTML(block: Block): string {
  if (block.type === BlockType.Image) {
    return `<img
        class = "timeline-block_draw-thumbnail"
        alt = "draw block image"
        src = "${block.imageSrc}" / >`
  }

  return `<img
        class = "timeline-block_clear-thumbnail"
        alt = "clear block image"
        src = "./resources/clear.png" / >`
}