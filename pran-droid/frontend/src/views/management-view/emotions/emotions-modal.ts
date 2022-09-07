import { inlineComponent, Modal, ModalContentInputs, onClick } from 'pran-gular-frontend';
import { EmotionApiModel, getEmotions } from '../../../api-interface/emotions';
import { editEmotionModal } from './edit-emotion-modal';
import './emotions-modal.css';

export const emotionsModal = inlineComponent<ModalContentInputs<void>>(controls => {
  controls.setup('emotions-modal', 'emotions-modal');
  controls.setComplexRendering();

  let emotions: EmotionApiModel[] = [];

  (() => {
    getEmotions()
      .then(response => {
        emotions = response;
        controls.changed();
      });
  })();

  const openEditEmotionModal = (t: MouseEvent & { target: HTMLInputElement }) =>
    Modal.open(editEmotionModal({ emotion: emotions.find(x => x.id === t.target.getAttribute('data-emotion-id')) }));

  return (i, r) => {
    r.div('emotions-modal_container')
      .h2().text('some content here').endEl();
      emotions.forEach(emotion => {
        r.div('emotions-modal_emotion-button-container')
          .button('button emotions-modal_emotion-button').attr('data-emotion-id', emotion.id).text(emotion.name).endEl()
        .endEl();
      });
    r.endEl();

    return e => onClick(e, '.emotions-modal_emotion-button', t => openEditEmotionModal(t))
  };
});