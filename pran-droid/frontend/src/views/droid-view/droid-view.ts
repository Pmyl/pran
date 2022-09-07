import { drawId, wait } from 'pran-animation-frontend';
import { Component, Container, inlineComponent, onClick } from 'pran-gular-frontend';
import { cmuPhonemesMap } from 'pran-phonemes-frontend';
import { StepAnimationRun } from '../../animation/run/step/step-animation-run';
import { connectToBrain } from '../../brain-connection/connect-to-brain';
import { PranDroid } from '../../droid/droid';
import { buildDroid } from '../../droid/droid-builder';
import { Emotion } from '../../droid/emotion';
import { ReactionType } from '../../droid/reaction';
import { SkipType } from '../../droid/skip';
import { authorize } from '../../helpers/is-authorized';
import { circleTranslationsXY } from '../../helpers/translation-functions/circle';
import { easeTranslations, easeIn, easeOut, easeInOut } from '../../helpers/translation-functions/ease';
import { concat, mergeXY, repeatXY, toXY } from '../../helpers/translation-functions/helpers';
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
    !isDebugMode && connectToBrain(pranDroid);
    isDebugMode && modifyIdleEmotion(pranDroid);
    testerComponent.setInputs({ pranDroid });
    pranDroid.start();
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

function modifyIdleEmotion(pranDroid: PranDroid) {
  const emotionRange = pranDroid.getEmotionRange();
  const wrappers: { [emotionId: string]: Emotion } = {};
  const emotionIds = Object.keys(emotionRange);

  for (let i = 0; i < emotionIds.length; i++) {
    const emotion = emotionRange[emotionIds[i]];
    wrappers[emotionIds[i]] = {
      id: emotionIds[i],
      speak: (phonemes, durationMs) => emotion.speak(phonemes, durationMs),
      asIdleAnimation: () => {
        return StepAnimationRun.animating({
          nextStep() {
            return {
              fps: 60,
              layers: [{
                id: 'head',
                actions: [drawId('idle')],
                loop: true,
                translations: new Map()/*mergeXY(
                  [],
                  concat(
                    easeTranslations(easeIn, 30, 0, -100, 30),
                    easeTranslations(easeOut, 30, -100, 0, 30),
                  )
                )*/
              }, {
                id: 'Mouth',
                parentId: 'head',
                actions: [drawId('happyIdle')],
                loop: true,
                translations: new Map()
              }, {
                id: 'eyes',
                parentId: 'head',
                actions: [
                  drawId('eyes0'),
                  wait(500),
                  drawId('eyes1'),
                  wait(3),
                  drawId('eyes2'),
                  wait(3),
                  drawId('eyes1'),
                  wait(3),
                  drawId('eyes0')
                ],
                loop: true,
                translations: new Map(
                  toXY(
                    concat(
                      1,
                      easeTranslations(easeInOut, 2, -3, 3, 2),
                      easeTranslations(easeInOut, 2, 3, -3, 2)
                    ),
                    []
                  )
                  // mergeXY(
                  //   repeatXY(
                  //     20,
                  //     circleTranslationsXY(20, 0, 0, 3, 10),
                  //     20 / 10 // duration / steps
                  //   ),
                  //   repeatXY(
                  //     4,
                  //     toXY(
                  //       [],
                  //       concat(
                  //         1,
                  //         easeTranslations(easeIn, 50, 0, -100, 50),
                  //         easeTranslations(easeOut, 50, -100, 0, 50),
                  //       )
                  //     )
                  //   )
                  // )
                )
              }]
            };
          }
        })
      }
    };
  }

  pranDroid.setEmotionRange(wrappers);
  let firstEmotion = pranDroid.getEmotionRange()[Object.keys(pranDroid.getEmotionRange())[0]];
  let idleAnimation = firstEmotion.asIdleAnimation();
  pranDroid.setIdle(idleAnimation);
}