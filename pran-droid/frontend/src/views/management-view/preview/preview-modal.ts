import { drawId, wait } from 'pran-animation-frontend';
import { Container, inlineComponent, ModalContentInputs, onClick } from 'pran-gular-frontend';
import { randomFramesBetweenInMs } from '../../../animation/helpers/random';
import { AnimationRun } from '../../../animation/run/animation-run';
import { StepAnimationRun } from '../../../animation/run/step/step-animation-run';
import { reactionToSteps } from '../../../brain-connection/response-parsers';
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
    pranDroid.setIdle(getIdleAnimation());
    pranDroid.start();
  })();

  async function simulateMessage(message: string) {
    const reaction = await fetch(
      `/api/brain/simulation/message`,
      {
        method: 'POST',
        body: JSON.stringify({ text: message, isMod: true, userName: 'pranessa' }),
        headers: { 'Content-Type': 'application/json' }
      })
      .then(x => x.json());

    if (!!reaction) {
      pranDroid.react(reactionToSteps(reaction));
    }
  }

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
      simulateMessage((e.querySelector('#preview-modal_message-input') as HTMLInputElement).value),
      (e.querySelector('#preview-modal_message-input') as HTMLInputElement).value = ''
    ));
  };
});

function getIdleAnimation(): AnimationRun {
  return StepAnimationRun.animating({
    nextStep() {
      const fps = 60;

      return {
        fps: fps,
        layers: [
          [
            drawId('happyIdle')
          ],
          [
            drawId('eyes_open'),
            wait(randomFramesBetweenInMs(5000, 10000, fps)),
            drawId('eyes_semi_open'),
            wait(3),
            drawId('eyes_closed'),
            wait(3),
            drawId('eyes_semi_open'),
            wait(3),
            drawId('eyes_open')
          ],
          [
            drawId('head_idle')
          ]
        ]
      }
    }
  });
}