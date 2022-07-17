import { drawId, wait } from 'pran-animation-frontend';
import { Container, inlineComponent } from 'pran-gular-frontend';
import { randomFramesBetweenInMs } from '../../animation/helpers/random';
import { AnimationRun } from '../../animation/run/animation-run';
import { StepAnimationRun } from '../../animation/run/step/step-animation-run';
import { connectToBrain } from '../../brain-connection/connect-to-brain';
import { buildDroid } from '../../droid/droid-builder';
import { authorize } from '../../helpers/is-authorized';
import { SpeechBubble } from '../../speech-bubble/speech-bubble';
import './droid-view.css';

export const droidView = inlineComponent(controls => {
  authorize();
  controls.setup("droid-view", "droid-view");

  const pranCanvas: Container = Container.CreateEmptyElement('canvas');
  (pranCanvas.componentElement as HTMLCanvasElement).width = 500;
  (pranCanvas.componentElement as HTMLCanvasElement).height = 500;
  pranCanvas.componentElement.style.width = '500px';
  pranCanvas.componentElement.style.height = '500px';
  pranCanvas.componentElement.style.marginTop = '-50px';
  const speechBubbleCanvas: Container = Container.CreateEmptyElement('canvas');
  const speechBubble = new SpeechBubble(speechBubbleCanvas.componentElement as HTMLCanvasElement);

  (async() => {
    const pranDroid = await buildDroid(pranCanvas, speechBubble);
    pranDroid.setIdle(getIdleAnimation());
    pranDroid.start();
    connectToBrain(pranDroid);
  })();

  return () => [
    speechBubbleCanvas,
    pranCanvas
  ];
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
