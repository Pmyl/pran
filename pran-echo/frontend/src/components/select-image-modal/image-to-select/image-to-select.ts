import './image-to-select.css';

import { inlineComponent } from '../../../framework/inline-component';

export const createImageToSelect = inlineComponent<{ id: string, imageSrc: string, isSelected: boolean }>(controls => {
  controls.setup('image-to-select', 'image-to-select');

  return inputs => `
<div class="image-to-select_container${inputs.isSelected ? ' isSelected' : ''}" data-imageId="${inputs.id}">
    <span class="image-to-select_id">${inputs.id}</span>
    <img class="image-to-select_image" src="${inputs.imageSrc}" alt="${inputs.id}"/>
</div>
`;
});