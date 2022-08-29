import { Component, Container, inlineComponent, onClick } from 'pran-gular-frontend';
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

  const isDebugMode = !!new URLSearchParams(window.location.search).has("debug");

  const pranCanvas: Container = Container.CreateEmptyElement('canvas', 'pran-droid-canvas');
  (pranCanvas.componentElement as HTMLCanvasElement).width = 1920;
  (pranCanvas.componentElement as HTMLCanvasElement).height = 1080;
  const speechBubbleCanvas: Container = Container.CreateEmptyElement('canvas', 'speech-bubble-canvas');
  const testerComponent = pranDroidTester();

  (async() => {
    const speechBubble = await SpeechBubble.create(speechBubbleCanvas.componentElement as HTMLCanvasElement);
    const pranDroid = await buildDroid(pranCanvas, speechBubble);
    pranDroid.start();
    !isDebugMode && connectToBrain(pranDroid);
    testerComponent.setInputs({ pranDroid });
  })();

  const componentsArray: Component<object>[] = [
    speechBubbleCanvas,
    pranCanvas
  ];
  isDebugMode && componentsArray.push(testerComponent);

  return () => componentsArray;
});

const pranDroidTester = inlineComponent<{ pranDroid: PranDroid }>(controls => {
  controls.setup('pran-droid-tester');
  controls.setComplexRendering();

  return (i, r) => {
    r.el('button', 'button button-small test-button').attr('type', 'button').text('Run test talk').endEl();

    return e => onClick(e, '.test-button', () => i.pranDroid.react([{
      bubble: {
        text: 'Hello my name is pran droid and I\'m cool, this is a bii',
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