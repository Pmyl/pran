import { inlineComponent, ModalContentInputs, onClick } from 'pran-gular-frontend';
import { getImages, ImageApiModel } from '../../../api-interface/images';

interface SelectImageResult {
  id: string;
}

export const selectImageModal = inlineComponent<ModalContentInputs<SelectImageResult> & { current: string | undefined }>(controls => {
  controls.setup('select-image-modal', 'select-image-modal');
  controls.setComplexRendering();

  let images: ImageApiModel[] = [];

  (async () => {
    images = await getImages();
    controls.changed();
  })();

  return (i, r) => {
    r.div()
      .div().text('some content').endEl();
      images.forEach(image => {
        r.button('button select-image-modal_image-button').attr('data-image-id', image.id)
          .el('img').attr('src', image.url).endEl()
        .endEl();
      });
    r.endEl();

    return e => onClick(e, '.select-image-modal_image-button', t => i.close({ id: (t.currentTarget as HTMLElement).getAttribute('data-image-id') }))
  };
});
