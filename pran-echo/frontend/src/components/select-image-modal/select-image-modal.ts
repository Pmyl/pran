import './select-image-modal.css';
import { AnimatorManager } from 'pran-animation-frontend';
import { inlineComponent } from '../../framework/inline-component';
import { onClick } from '../../framework/on-click';
import { ModalContentInputs } from '../modal-template/modal-template';

type SelectImageModalInputs = ModalContentInputs<[string, HTMLImageElement]> & {
  animatorManager: AnimatorManager;
};

export const createSelectImageModal = inlineComponent<SelectImageModalInputs>(controls => {
  controls.setup('select-image-modal', 'select-image-modal');

  return inputs => [`<div>
    <button type="button" class="select-image-modal_close-button">X</button>
    ${Array.from((inputs.animatorManager as any)._imagesMap).map(([id, image]) => `
      <div class="select-image-modal_image-container" data-imageId="${id}">
          <span class="select-image-modal_image-id">${id}</span>
          <img class="select-image-modal_image" src="${image.src}" alt="${id}"/>
      </div>
    `).join('')}
</div>
`, e => (onClick(e, '.select-image-modal_close-button', () => inputs.close()),
    onClick(e, '.select-image-modal_image-container', e => inputs.close([
      // TODO: make this map public
      (e.currentTarget as HTMLElement).attributes.getNamedItem('data-imageId').value,
      (inputs.animatorManager as any)._imagesMap.get((e.currentTarget as HTMLElement).attributes.getNamedItem('data-imageId').value)
    ]))
  )];
});