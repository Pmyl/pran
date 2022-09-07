import { Container, dropdown, inlineComponent, ModalContentInputs, onClick } from 'pran-gular-frontend';
import { simulateBrainMessage, simulateBrainRedeem } from '../../../brain-connection/simulate-brain';
import { PranDroid } from '../../../droid/droid';
import { buildDroid } from '../../../droid/droid-builder';
import { SpeechBubble } from '../../../speech-bubble/speech-bubble';
import './preview-modal.css';
import { PranDroidReactionDefinitions } from '../../public-view/models';

export const previewModal = inlineComponent<ModalContentInputs<void> & { reactions: PranDroidReactionDefinitions }>(controls => {
  controls.setup("preview-modal", "preview-modal");
  controls.setComplexRendering();

  const pranCanvas: Container = Container.CreateEmptyElement('canvas');
  (pranCanvas.componentElement as HTMLCanvasElement).width = 500;
  (pranCanvas.componentElement as HTMLCanvasElement).height = 500;
  pranCanvas.componentElement.style.width = '500px';
  pranCanvas.componentElement.style.height = '500px';
  pranCanvas.componentElement.style.marginTop = '-50px';
  const speechBubbleCanvas: Container = Container.CreateEmptyElement('canvas');
  let pranDroid: PranDroid,
    redeems: string[] = [];

  (async() => {
    const speechBubble = await SpeechBubble.create(speechBubbleCanvas.componentElement as HTMLCanvasElement);
    speechBubble.shush();
    pranDroid = await buildDroid(pranCanvas, speechBubble);
    pranDroid.start();
  })();

  controls.onInputChange = {
    reactions: r => {
      r.forEach(reaction => {
        reaction.triggers.forEach(trigger => {
          if (trigger.type === 'Action' && trigger.name === 'reward_redeem') {
            redeems.push(trigger.id);
          }
        });
      });
    }
  };

  return (inputs, r) => {
    controls.mandatoryInput('reactions');

    r.cmpi(speechBubbleCanvas)
      .cmpi(pranCanvas)
      .el('form', 'preview-modal_form')
        .el('div', 'preview-modal_rewards')
          .cmp(dropdown, {
            buttons: redeems.map(redeem => ({ id: redeem, text: redeem })),
            onSelect: id => simulateBrainRedeem(pranDroid, id),
            position: 'Top'
          })
        .endEl()
        .el('input').attr('type', 'text').attr('id', 'preview-modal_message-input').endEl()
        .el('div', 'preview-modal_button-container')
          .el('button', 'button preview-modal_send-message-button').attr('type', 'submit').text('SEND').endEl()
        .endEl()
      .endEl();

    return e => onClick(e, '.preview-modal_send-message-button', ev => (
      ev.preventDefault(),
      simulateBrainMessage(pranDroid, (e.querySelector('#preview-modal_message-input') as HTMLInputElement).value),
      (e.querySelector('#preview-modal_message-input') as HTMLInputElement).value = ''
    ));
  };
});