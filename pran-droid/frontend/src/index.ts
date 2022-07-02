import { ActionType, Animator, AnimatorManager, CanvasControllerFactory, drawId, wait } from 'pran-animation-frontend';
import { Container, inlineComponent } from 'pran-gular-frontend';
import { randomFramesBetweenInMs } from './animation/helpers/random';
import { PlayerController } from './animation/player-controller';
import { PranDroidAnimationPlayer } from './animation/pran-droid-animation-player';
import { AnimationRun } from './animation/run/animation-run';
import { StepAnimationRun } from './animation/run/step/step-animation-run';
import { LoopAnimationStepper } from './animation/run/step/stepper/loop-animation-stepper';
import { SingleAnimationStepper } from './animation/run/step/stepper/single-animation-stepper';
import { connectToBrain } from './brain-connection/connect-to-brain';
import { PranDroid } from './droid/droid';
import { buildDroid } from './droid/droid-builder';
import { ConfigurableEmotion, EmotionLayer } from './droid/emotion';
import { PranDroidReaction, ReactionType } from './droid/reaction';
import { SkipType } from './droid/skip';
import { animationToTimelineActions } from './helpers/animation-to-timeline-action';
import './index.css';
import { SpeechBubble } from './speech-bubble/speech-bubble';

const missing_authorization_message = inlineComponent(controls => {
  controls.setup("missing-authorization-message");
  return () => `<p style="font-size: 3em; background-color: lightcoral; padding: 5px;">Missing authorization, make sure you've copied the entire url</p>`;
})

document.addEventListener('DOMContentLoaded', async() => {
  const apiSecretKey = new URLSearchParams(window.location.search).get("api_secret_key");

  if (!!apiSecretKey) {
    document.cookie = `api_secret_key=${apiSecretKey}`;
    await start();
  } else {
    const body: Container = Container.CreateBody();
    body.append(missing_authorization_message());
    body.render();
  }
});

async function start() {
  const body: Container = Container.CreateBody();
  const pranCanvas: Container = Container.CreateEmptyElement('canvas');
  (pranCanvas.componentElement as HTMLCanvasElement).width = 500;
  (pranCanvas.componentElement as HTMLCanvasElement).height = 500;
  pranCanvas.componentElement.style.width = '500px';
  pranCanvas.componentElement.style.height = '500px';
  pranCanvas.componentElement.style.marginTop = '-50px';
  const speechBubbleCanvas: Container = Container.CreateEmptyElement('canvas');
  const speechBubble = new SpeechBubble(speechBubbleCanvas.componentElement as HTMLCanvasElement);

  body.append(speechBubbleCanvas);
  body.append(pranCanvas);
  body.render();

  const pranDroid = await buildDroid(pranCanvas, speechBubble);
  pranDroid.setIdle(getIdleAnimation());
  //setupDemoData(pranDroid);

  pranDroid.start();
  connectToBrain(pranDroid);
}

function setupDemoData(pranDroid: PranDroid) {
  pranDroid.setEmotionRange({
    'happy': new ConfigurableEmotion([
      { type: EmotionLayer.Mouth },
      { type: EmotionLayer.Animation, animation: () => [drawId('head_idle')] },
      { type: EmotionLayer.Animation, animation: () => [
        drawId('eyes_open'),
        wait(200),
        drawId('eyes_semi_open'),
        wait(3),
        drawId('eyes_closed'),
        wait(3),
        drawId('eyes_semi_open'),
        wait(3),
        drawId('eyes_open')
      ]}
    ]),
    'drugged': new ConfigurableEmotion([
      { type: EmotionLayer.Mouth },
      { type: EmotionLayer.Animation, animation: () => [drawId('head_idle')] },
      { type: EmotionLayer.Animation, animation: () => [drawId('eyes_semi_open')] }
    ]),
    'glad': new ConfigurableEmotion([
      { type: EmotionLayer.Mouth },
      { type: EmotionLayer.Animation, animation: () => [drawId('head_idle')] },
      { type: EmotionLayer.Animation, animation: () => [drawId('eyes_closed')] }
    ]),
    'sad': new ConfigurableEmotion([
      { type: EmotionLayer.Mouth },
      { type: EmotionLayer.Animation, animation: () => [drawId('head_idle')] },
      { type: EmotionLayer.Animation, animation: () => [drawId('eyes_open')] }
    ]),
    'crazy': new ConfigurableEmotion([
      { type: EmotionLayer.Mouth },
      { type: EmotionLayer.Animation, animation: () => [drawId('head_idle')] },
      { type: EmotionLayer.Animation, animation: () => [
        drawId('eyesFire0'),
        wait(3),
        drawId('eyesFire1'),
        wait(3),
        drawId('eyesFire2'),
        wait(3),
        drawId('eyesFire3'),
        wait(3),
        drawId('eyesFire4'),
        wait(3),
        drawId('eyesFire5'),
        wait(3),
        drawId('eyesFire6'),
        wait(3)
      ]}
    ])
  });
  const reactions: PranDroidReaction[] = [
    {
      type: ReactionType.Talking,
      emotion: 'happy',
      phonemes: 'HH AH L OW , M AY N EY M IH Z P R AH N EH S AH AH N D AY W AA N T T UW L EH T Y UW N OW DH AE T .'.split(' '),
      bubble: 'hello my name is prandroid and I want to let you know that',
      skip: { type: SkipType.AfterStep, extraMs: 500 }
    },
    {
      type: ReactionType.CompositeTalking,
      reactions: [
        {
          type: ReactionType.Talking,
          emotion: 'glad',
          phonemes: 'UW'.split(' '),
          bubble: { text: 'YOU', letterByLetter: false },
          skip: { type: SkipType.AfterStep, extraMs: 500 }
        },
        {
          type: ReactionType.Talking,
          emotion: 'glad',
          phonemes: 'AY R R'.split(' '),
          bubble: { text: ' ARE', letterByLetter: true },
          skip: { type: SkipType.AfterStep, extraMs: 500 }
        },
        {
          type: ReactionType.Talking,
          emotion: 'glad',
          phonemes: 'K OW OW L'.split(' '),
          bubble: { text: ' COOL', letterByLetter: false },
          skip: { type: SkipType.AfterStep, extraMs: 1000 }
        }
      ]
    },
    {
      type: ReactionType.Talking,
      emotion: 'crazy',
      phonemes: 'EY N D AY L OW EY OW UH .'.split(' '),
      bubble: 'and I love you',
      skip: { type: SkipType.AfterStep, extraMs: 2000 }
    }
  ];
  pranDroid.react(reactions);
}

function getMouthLoopingAnimation(): AnimationRun {
  return StepAnimationRun.animating(LoopAnimationStepper.create({
    fps: 60,
    layers: [
      [
        { type: ActionType.Draw, imageId: 'pause' },
        { type: ActionType.None, amount: 9 },
        { type: ActionType.Draw, imageId: 'smile' },
        { type: ActionType.None, amount: 9 }
      ],
      [
        { type: ActionType.Draw, imageId: 'eyes_open' }
      ],
      [
        { type: ActionType.Draw, imageId: 'head_idle' }
      ]
    ]
  }));
}

function getMouthSingleAnimation(): AnimationRun {
  return StepAnimationRun.animating(SingleAnimationStepper.create({
    fps: 60,
    layers: [
      [
        { type: ActionType.Draw, imageId: 'pause' },
        { type: ActionType.None, amount: 9 },
        { type: ActionType.Draw, imageId: 'smile' },
        { type: ActionType.None, amount: 9 }
      ],
      [
        { type: ActionType.Draw, imageId: 'eyes_open' }
      ],
      [
        { type: ActionType.Draw, imageId: 'head_idle' }
      ]
    ]
  }));
}

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
