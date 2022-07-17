import { Animator, Timeline } from 'pran-animation-frontend';
import { inlineComponentOld, onClick } from 'pran-gular-frontend';
import { Block, BlockType } from '../../../core/block/block';
import { Mediator } from '../../../core/mediator/mediator';
import './block.css';
import { BlockSelected } from '../../timeline/timeline-bar/timeline-bar';
import { createTimelineBlockHandles } from '../block-handles/block-handles';

interface BlockInputs {
  block: Block,
  timeline: Timeline,
  animator: Animator,
  frameWidth: number,
  onSelect: () => void,
  isHighlighted: boolean
}

export const createBlock = inlineComponentOld<BlockInputs>(controls => {
  controls.setup('block', 'block');

  const handles = createTimelineBlockHandles();
  let unsubscribeOnChange: () => void,
    unsubscribeEvent: () => void,
    isSelected: boolean = false,
    isHighlighted: boolean = false;

  controls.onInputChange = {
    block: b => {
      unsubscribeOnChange?.();
      unsubscribeOnChange = b.onChange(controls.changed);
      unsubscribeEvent?.();
      unsubscribeEvent = Mediator.onEvent<BlockSelected>('blockSelected', ({ block: selectedBlock, animator, timeline, timelineBar }) => {
        const isNewlySelectedBlock = selectedBlock === b;

        if (isSelected !== isNewlySelectedBlock) {
          isSelected = isNewlySelectedBlock,
          handles.setInputs({ isSelected, block: selectedBlock, animator, timeline, timelineBar }),
          controls.changed()
        }
      });
      handles.setInput('block', b);
    },
    frameWidth: fw => {
      handles.setInput('frameWidth', fw);
    },
    isHighlighted: ih => {
      if (ih) {
        isHighlighted = true;
        setTimeout(() => {
          isHighlighted = false;
        }, 100);
      }
    }
  };

  controls.onDestroy = () => unsubscribeOnChange?.();
  return inputs => controls.mandatoryInput('block')
    && controls.mandatoryInput('frameWidth')
    && controls.mandatoryInput('animator')
    && controls.mandatoryInput('timeline')
    && [[handles, `
<div class="block_block${isSelected ? ' isSelected' : ''}${isHighlighted ? ' isHighlighted' : ''}" style="width:${inputs.block.visualFrames * inputs.frameWidth}px">
    ${createThumbnailHTML(inputs.block)}
</div>`], el => onClick(el, '.block_block', () => inputs.onSelect())];
});

function createThumbnailHTML(block: Block): string {
  if (block.type === BlockType.Image) {
    return `<img
        class = "block_draw-thumbnail"
        alt = "draw block image"
        src = "${block.imageSrc}" / >`
  }

  return `<img
        class = "block_clear-thumbnail"
        alt = "clear block image"
        src = "./resources/clear.png" / >`
}
