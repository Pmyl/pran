import './select-image-modal.css';
import { AnimatorManager } from 'pran-animation-frontend';
import { Component } from '../../framework/component';
import { inlineComponent } from '../../framework/inline-component';
import { onClick } from '../../framework/on-click';
import { onDoubleClick } from '../../framework/on-double-click';
import { ModalContentInputs } from '../modal-template/modal-template';
import { createImageToSelect } from './image-to-select/image-to-select';

type SelectImageModalInputs = ModalContentInputs<[string, HTMLImageElement]> & {
  animatorManager: AnimatorManager;
};

export const createSelectImageModal = inlineComponent<SelectImageModalInputs>(controls => {
  controls.setup('select-image-modal', 'select-image-modal');
  let images: Map<string, Component<{ id: string, imageSrc: string, isSelected: boolean }>>
    = new Map<string, Component<{ id: string, imageSrc: string, isSelected: boolean }>>(),
    currentlySelectedImage: Component<{ id: string, imageSrc: string, isSelected: boolean }> = null;
  
  controls.onInputChange = {
    animatorManager: am => {
      Array.from(am.imagesMap).map(([id, image]) => {
        return {
          id,
          component: createImageToSelect({ id, imageSrc: image.src, isSelected: false }).setData('data-imageId', id)
        };
      }).forEach(data => {
        images.set(data.id, data.component);
      });
    }
  };

  return inputs => [Array.from(images).map(([_, component]) => component), e => (
    onClick(e, '.image-to-select', e => {
      const id = (e.currentTarget as HTMLElement).attributes.getNamedItem('data-imageId').value;
      const image = images.get(id);
      if (currentlySelectedImage === image) return;

      image.setInput('isSelected', true);
      currentlySelectedImage && currentlySelectedImage.setInput('isSelected', false);
      currentlySelectedImage = image;
    }),
    onDoubleClick(e, '.image-to-select', e => {
      const id = (e.currentTarget as HTMLElement).attributes.getNamedItem('data-imageId').value;
      inputs.close([id, inputs.animatorManager.imagesMap.get(id)]);
    })
  )];
});
