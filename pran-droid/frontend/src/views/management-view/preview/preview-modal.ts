import { Container, inlineComponent, ModalContentInputs, onClick } from 'pran-gular-frontend';
import { simulateBrainMessage } from '../../../brain-connection/simulate-brain';
import { PranDroid } from '../../../droid/droid';
import { buildDroid } from '../../../droid/droid-builder';
import { SpeechBubble } from '../../../speech-bubble/speech-bubble';
import './preview-modal.css';

export const previewModal = inlineComponent<ModalContentInputs<void>>(controls => {
  controls.setup("preview-modal", "preview-modal");
  controls.setComplexRendering();

  const pranCanvas: Container = Container.CreateEmptyElement('canvas');
  (pranCanvas.componentElement as HTMLCanvasElement).width = 500;
  (pranCanvas.componentElement as HTMLCanvasElement).height = 500;
  pranCanvas.componentElement.style.width = '500px';
  pranCanvas.componentElement.style.height = '500px';
  pranCanvas.componentElement.style.marginTop = '-50px';
  const speechBubbleCanvas: Container = Container.CreateEmptyElement('canvas');
  const speechBubble = new SpeechBubble(speechBubbleCanvas.componentElement as HTMLCanvasElement);
  let pranDroid: PranDroid;

  (async() => {
    pranDroid = await buildDroid(pranCanvas, speechBubble);
    pranDroid.start();
  })();

  return (inputs, r) => {
    r.cmpi(speechBubbleCanvas)
      .cmpi(pranCanvas)
      .el('form', 'preview-modal_form')
        .el('input').attr('type', 'text').attr('id', 'preview-modal_message-input').endEl()
        .el('div', 'preview-modal_button-container')
          .el('button', 'button preview-modal_send-button').attr('type', 'submit').text('SEND').endEl()
        .endEl()
      .endEl();

    return e => onClick(e, '.preview-modal_send-button', ev => (
      ev.preventDefault(),
      simulateBrainMessage(pranDroid, (e.querySelector('#preview-modal_message-input') as HTMLInputElement).value),
      (e.querySelector('#preview-modal_message-input') as HTMLInputElement).value = ''
    ));
  };
});