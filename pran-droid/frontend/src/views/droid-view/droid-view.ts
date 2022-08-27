import { Container, inlineComponent, onClick } from 'pran-gular-frontend';
import { cmuPhonemesMap } from 'pran-phonemes-frontend';
import { connectToBrain } from '../../brain-connection/connect-to-brain';
import { PranDroid } from '../../droid/droid';
import { buildDroid } from '../../droid/droid-builder';
import { ReactionType } from '../../droid/reaction';
import { SkipType } from '../../droid/skip';
import { authorize } from '../../helpers/is-authorized';
import { SpeechBubble } from '../../speech-bubble/speech-bubble';
import './droid-view.css';

export const droidView = inlineComponent(controls => {
  authorize();
  controls.setup("droid-view", "droid-view");

  const pranCanvas: Container = Container.CreateEmptyElement('canvas');
  (pranCanvas.componentElement as HTMLCanvasElement).width = 1920;
  (pranCanvas.componentElement as HTMLCanvasElement).height = 1080;
  pranCanvas.componentElement.style.width = '1920px';
  pranCanvas.componentElement.style.height = '1080px';
  pranCanvas.componentElement.style.position = 'absolute';
  pranCanvas.componentElement.style.top = '0';
  pranCanvas.componentElement.style.right = '0';
  pranCanvas.componentElement.style.bottom = '0';
  pranCanvas.componentElement.style.left = '0';
  const speechBubbleCanvas: Container = Container.CreateEmptyElement('canvas');
  const speechBubble = new SpeechBubble(speechBubbleCanvas.componentElement as HTMLCanvasElement);
  speechBubbleCanvas.componentElement.style.position = 'absolute';
  speechBubbleCanvas.componentElement.style.top = '0';
  speechBubbleCanvas.componentElement.style.right = '0';
  speechBubbleCanvas.componentElement.style.bottom = '0';
  speechBubbleCanvas.componentElement.style.left = '0';
  const testerComponent = pranDroidTester();

  (async() => {
    const pranDroid = await buildDroid(pranCanvas, speechBubble);
    pranDroid.start();
    //connectToBrain(pranDroid);
    testerComponent.setInputs({ pranDroid });
  })();

  return () => [
    speechBubbleCanvas,
    pranCanvas,
    testerComponent
  ];
});

const pranDroidTester = inlineComponent<{ pranDroid: PranDroid }>(controls => {
  controls.setup('pran-droid-tester');
  controls.setComplexRendering();

  return (i, r) => {
    r.el('button', 'button button-small test-button').attr('type', 'button').text('Run test talk').endEl();

    return e => onClick(e, '.test-button', () => i.pranDroid.react([{
      bubble: {
        text: 'Hello my name is pran droid and I\'m cool',
        letterByLetter: true
      },
      skip: {
        type: SkipType.AfterStep,
        extraMs: 3000
      },
      emotion: Object.keys(i.pranDroid.getEmotionRange())[0],
      phonemes: [cmuPhonemesMap.keys().next().value],
      type: ReactionType.Talking
    }]));
  };
});