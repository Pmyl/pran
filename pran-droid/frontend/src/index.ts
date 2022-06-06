import { ActionType, Animator, AnimatorManager, CanvasControllerFactory, drawId, ManagerTimelineAction, wait } from 'pran-animation-frontend';
import { Container, inlineComponent } from 'pran-gular-frontend';
import { cmuPhonemesMap, phonemesMapper } from 'pran-phonemes-frontend';
import { randomFramesBetweenInMs } from './animation/helpers/random';
import { PlayerController } from './animation/player-controller';
import { PranDroidAnimationPlayer } from './animation/pran-droid-animation-player';
import { AnimationRun } from './animation/run/animation-run';
import { StepAnimationRun } from './animation/run/step/step-animation-run';
import { LoopAnimationStepper } from './animation/run/step/stepper/loop-animation-stepper';
import { SingleAnimationStepper } from './animation/run/step/stepper/single-animation-stepper';
import { waitFor } from './helpers/async';
import './index.css';
import { SpeechBubble } from './speech-bubble/speech-bubble';

const header = inlineComponent((controls) => {
  controls.setup('base-cmp');

  return () => `
    <span>Pran Droid</span>
  `;
});

interface BrainMovingReaction {
  type: ReactionType.Moving;
  animation: { frameStart: number, frameEnd: number, imageId: string }[];
  bubble?: string | { text: string; letterByLetter: boolean; };
  skip?: PranDroidSkipAfterMs | { after: PranDroidReactionSkipAfter, waitExtraMs?: number };
}

type DroidBrainReaction = { steps: (BrainMovingReaction | TalkingReaction | CompositeTalkingReaction)[] };

function connectToBrain(pranDroid: PranDroid) {
  const socket = new WebSocket('ws://localhost:8080');

  socket.addEventListener('open', function (event) {
    socket.send('Hello Server!');
  });

  function getAnimation(step: BrainMovingReaction): AnimationRun {
    return StepAnimationRun.animating(SingleAnimationStepper.create({
      fps: 60,
      layers: [
        {
          loop: false,
          actions: step.animation.flatMap(frame => {
            const actions: ManagerTimelineAction[] = [{
              type: ActionType.Draw,
              imageId: frame.imageId
            }];

            if (frame.frameEnd - frame.frameStart > 1) {
              actions.push({
                type: ActionType.None,
                amount: frame.frameEnd - frame.frameStart - 1
              });
            }

            return actions;
          })
        }
      ]
    }));
  }

  socket.addEventListener('message', function (event) {
    try {
      const message: DroidBrainReaction = JSON.parse(event.data);
      console.log('Input received from websocket', message);

      const reactions: PranDroidReaction[] = message.steps.map(step => {
        switch (step.type) {
          case ReactionType.Moving:
            return {
              type: ReactionType.Moving,
              movements: getAnimation(step),
              bubble: step.bubble,
              skip: step.skip
            };
          case ReactionType.Talking:
            return {
              type: ReactionType.Talking,
              emotion: step.emotion,
              phonemes: step.phonemes,
              bubble: step.bubble,
              skip: step.skip
            } as TalkingReaction;
          default:
            throw new Error("unhandled step type " + step.type);
        }
      });

      pranDroid.react(reactions);
    } catch(e) {
      console.error("Message received from websocket, error occurred", e);
    }
  });
}

document.addEventListener('DOMContentLoaded', async() => {
  const body: Container = Container.CreateBody();
  const pranCanvas: Container = Container.CreateEmptyElement('canvas');
  (pranCanvas.componentElement as HTMLCanvasElement).width = 500;
  (pranCanvas.componentElement as HTMLCanvasElement).height = 500;
  pranCanvas.componentElement.style.width = '500px';
  pranCanvas.componentElement.style.height = '500px';
  pranCanvas.componentElement.style.marginTop = '-50px';
  const speechBubbleCanvas: Container = Container.CreateEmptyElement('canvas');
  const speechBubble = new SpeechBubble(speechBubbleCanvas.componentElement as HTMLCanvasElement);
  const animationPlayer = await setupPranDroidAnimation(pranCanvas);

  body.append(header());
  body.append(speechBubbleCanvas);
  body.append(pranCanvas);
  body.render();

  const reactions: PranDroidReaction[] = [
    {
      type: ReactionType.Talking,
      emotion: 'happy',
      phonemes: 'HH AH L OW , M AY N EY M IH Z P R AH N EH S AH AH N D AY W AA N T T UW L EH T Y UW N OW DH AE T .'.split(' '),
      bubble: 'hello my name is prandroid and I want to let you know that',
      skip: { after: PranDroidReactionSkipAfter.LatestBubbleMovements, waitExtraMs: 500 }
    },
    {
      type: ReactionType.CompositeTalking,
      reactions: [
        {
          type: ReactionType.Talking,
          emotion: 'glad',
          phonemes: 'UW'.split(' '),
          bubble: { text: 'YOU', letterByLetter: false },
          skip: { after: PranDroidReactionSkipAfter.LatestBubbleMovements, waitExtraMs: 500 }
        },
        {
          type: ReactionType.Talking,
          emotion: 'glad',
          phonemes: 'AY R R'.split(' '),
          bubble: { text: ' ARE', letterByLetter: true },
          skip: { after: PranDroidReactionSkipAfter.LatestBubbleMovements, waitExtraMs: 500 }
        },
        {
          type: ReactionType.Talking,
          emotion: 'glad',
          phonemes: 'K OW OW L'.split(' '),
          bubble: { text: ' COOL', letterByLetter: false },
          skip: { after: PranDroidReactionSkipAfter.LatestBubbleMovements, waitExtraMs: 1000 }
        }
      ]
    },
    {
      type: ReactionType.Talking,
      emotion: 'crazy',
      phonemes: 'EY N D AY L OW EY OW UH .'.split(' '),
      bubble: 'and I love you',
      skip: { after: PranDroidReactionSkipAfter.Bubble, waitExtraMs: 2000 }
    }
  ];

  const pranDroid = new PranDroid(animationPlayer, speechBubble);
  pranDroid.setIdle(getIdleAnimation());
  pranDroid.setEmotionRange({
    'happy': new ConfigurableEmotion({
      getHeadLayer(): ManagerTimelineAction[] {
        return [
          drawId('head_idle')
        ];
      },
      getEyesLayer(): ManagerTimelineAction[] {
        return [
          drawId('eyes_open'),
          wait(200),
          drawId('eyes_semi_open'),
          wait(3),
          drawId('eyes_closed'),
          wait(3),
          drawId('eyes_semi_open'),
          wait(3),
          drawId('eyes_open')
        ];
      },
    }),
    'drugged': new ConfigurableEmotion({
      getHeadLayer(): ManagerTimelineAction[] {
        return [
          drawId('head_idle')
        ];
      },
      getEyesLayer(): ManagerTimelineAction[] {
        return [
          drawId('eyes_semi_open'),
        ];
      },
    }),
    'glad': new ConfigurableEmotion({
      getHeadLayer(): ManagerTimelineAction[] {
        return [
          drawId('head_idle')
        ];
      },
      getEyesLayer(): ManagerTimelineAction[] {
        return [
          drawId('eyes_closed')
        ];
      },
    }),
    'sad': new ConfigurableEmotion({
      getHeadLayer(): ManagerTimelineAction[] {
        return [
          drawId('head_idle')
        ];
      },
      getEyesLayer(): ManagerTimelineAction[] {
        return [
          drawId('eyes_open')
        ];
      },
    }),
    'crazy': new ConfigurableEmotion({
      getHeadLayer(): ManagerTimelineAction[] {
        return [
          drawId('head_idle')
        ];
      },
      getEyesLayer(): ManagerTimelineAction[] {
        return [
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
          wait(3),
        ];
      },
    })
  })

  pranDroid.react(reactions);
  connectToBrain(pranDroid);
});

class PranDroid {
  private _animationPlayer: PranDroidAnimationPlayer;
  private _speechBubble: SpeechBubble;
  private _idleAnimation: AnimationRun;

  private _isReacting: boolean;
  private _reactionQueue: PranDroidReaction[] = [];
  private _emotionRange: { [emotion: string]: Emotion };

  constructor(animationPlayer: PranDroidAnimationPlayer, speechBubble: SpeechBubble) {
    this._animationPlayer = animationPlayer;
    this._speechBubble = speechBubble;
  }

  public setIdle(idleAnimation: AnimationRun): void {
    this._idleAnimation = idleAnimation;
  }

  public setEmotionRange(emotionRange: { [emotion: string]: Emotion }): void {
    this._emotionRange = emotionRange;
  }

  public start(): void {
    this._stayIdling();
    this._isReacting = false;
  }

  public react(reactions: PranDroidReaction[]): void {
    this._reactionQueue.push(...reactions);
    this._move();
  }

  private _move(): void {
    if (this._isReacting) {
      return;
    }

    this._isReacting = true;

    (async () => {
      let reaction;

      while (reaction = this._reactionQueue.shift()) {
        await this._executeReaction(reaction);
      }

      this._isReacting = false;
      this._stayIdling();
    })();
  }

  private _stayIdling(): void {
    this._animationPlayer.play(this._idleAnimation);
    this._speechBubble.clearBubble();
  }

  private _executeReaction(reaction: PranDroidReaction): Promise<void> {
    switch (reaction.type) {
      case ReactionType.Moving:
        return this._executeMoveReaction(reaction);
      case ReactionType.Talking:
        return this._executeTalkReaction(reaction);
      case ReactionType.CompositeTalking:
        return this._executeCompositeReaction(reaction);
    }
  }

  private async _executeMoveReaction(reaction: MovingReaction) {
    const animationExecution = this._animationPlayer.play(reaction.movements);
    const speechResult = this._showBubble(reaction);
    await this._waitReactionTime(reaction, speechResult, animationExecution);
  }

  private async _executeTalkReaction(reaction: TalkingReaction) {
    const emotion = this._getEmotion(reaction.emotion);
    const animationExecution = this._animationPlayer.play(emotion.speak(reaction.phonemes));
    const speechResult = this._showBubble(reaction);
    await this._waitReactionTime(reaction, speechResult, animationExecution);
  }

  private async _executeCompositeReaction(compositeReaction: CompositeTalkingReaction): Promise<void> {
    this._speechBubble.openBubble();
    for (const reaction of compositeReaction.reactions) {
      await this._executeTalkReaction(reaction);
    }
    this._speechBubble.closeBubble();
  }

  private _waitReactionTime(reaction: MovingReaction | TalkingReaction, speechResult: { durationMs: number }, animationExecution: Promise<unknown>): Promise<unknown> {
    if (isSkipAfterMs(reaction.skip)) {
      return waitFor(reaction.skip.afterMs);
    } else {
      const skip = reaction.skip ?? { after: PranDroidReactionSkipAfter.LatestBubbleMovements };

      switch (skip.after) {
        case PranDroidReactionSkipAfter.Movements:
          return animationExecution;
        case PranDroidReactionSkipAfter.Bubble:
          return waitFor((skip.waitExtraMs || 0) + speechResult.durationMs);
        case PranDroidReactionSkipAfter.LatestBubbleMovements:
          return Promise.all([animationExecution, waitFor((skip.waitExtraMs || 0) + speechResult.durationMs)]);
      }
    }
  }

  private _showBubble(reaction: MovingReaction | TalkingReaction) {
    let speechResult = { durationMs: 0 };

    if (reaction.bubble) {
      if (typeof reaction.bubble === 'string') {
        speechResult = this._speechBubble.drawSpeech(reaction.bubble);
      } else {
        speechResult = this._speechBubble.drawSpeech(reaction.bubble.text, { letterByLetter: reaction.bubble.letterByLetter });
      }
    } else {
      this._speechBubble.clearBubble();
    }
    return speechResult;
  }

  private _getEmotion(emotion: string): Emotion {
    return this._emotionRange[emotion];
  }
}

interface Emotion {
  speak(phonemes: string[]): AnimationRun;
}

interface EmotionConfig {
  getEyesLayer(): ManagerTimelineAction[];
  getHeadLayer(): ManagerTimelineAction[];
}

class ConfigurableEmotion implements Emotion {
  private _emotionConfig: EmotionConfig;

  constructor(emotionConfig: EmotionConfig) {
    this._emotionConfig = emotionConfig;
  }

  public speak(phonemes: string[]): AnimationRun {
    const mouthMovementsMapping = phonemesMapper(phonemes, cmuPhonemesMap);

    return StepAnimationRun.animating(SingleAnimationStepper.create({
      fps: 60,
      layers: [
        mouthMovementsMapping.flatMap(mapping => (
          [drawId(mapping.output), wait(5)]
        )),
        { actions: this._emotionConfig.getEyesLayer(), loop: true },
        { actions: this._emotionConfig.getHeadLayer(), loop: true }
      ]
    }));
  }
}

function isSkipAfterMs(skip: (MovingReaction | TalkingReaction)['skip'] | undefined): skip is PranDroidSkipAfterMs {
  return (skip as PranDroidSkipAfterMs)?.afterMs !== undefined;
}

enum ReactionType {
  Moving = "Moving",
  Talking = "Talking",
  CompositeTalking = "CompositeTalking"
}

interface MovingReaction {
  type: ReactionType.Moving;
  movements: AnimationRun;
  bubble?: string | { text: string; letterByLetter: boolean; };
  skip?: PranDroidSkipAfterMs | { after: PranDroidReactionSkipAfter, waitExtraMs?: number };
}

interface CompositeTalkingReaction {
  type: ReactionType.CompositeTalking;
  reactions: TalkingReaction[];
}

interface TalkingReaction {
  type: ReactionType.Talking;
  emotion: string;
  phonemes: string[];
  bubble?: string | { text: string; letterByLetter: boolean; };
  skip?: PranDroidSkipAfterMs | { after: PranDroidReactionSkipAfter, waitExtraMs?: number };
}

type PranDroidReaction = MovingReaction | TalkingReaction | CompositeTalkingReaction;

interface PranDroidSkipAfterMs {
  afterMs: number;
}

enum PranDroidReactionSkipAfter {
  Movements,
  Bubble,
  LatestBubbleMovements
}

async function setupPranDroidAnimation(pranCanvas: Container): Promise<PranDroidAnimationPlayer> {
  const animatorManager: AnimatorManager = await AnimatorManager.create(
    CanvasControllerFactory.createFrom((pranCanvas.componentElement as HTMLCanvasElement).getContext('2d')),
    [
      ['fv', './resources/mouth/f,v.png'],
      ['ur', './resources/mouth/u,r.png'],
      ['stch', './resources/mouth/s,t,ch.png'],
      ['mbsilent', './resources/mouth/m,b,silent.png'],
      ['p1', './resources/mouth/p-1.png'],
      ['p2', './resources/mouth/p-2.png'],
      ['e', './resources/mouth/e.png'],
      ['aah', './resources/mouth/a,ah.png'],
      ['o', './resources/mouth/ooh.png'],
      ['ld', './resources/mouth/l,d.png'],
      ['pause', './resources/mouth/pause.png'],
      ['smile', './resources/mouth/smile.png'],
      ['head_idle', './resources/idle_0000.png'],
      ['eyes_open', './resources/eyes/eyes_0000.png'],
      ['eyes_semi_open', './resources/eyes/eyes_0001.png'],
      ['eyes_closed', './resources/eyes/eyes_0002.png'],
      ['eyesFire0', './resources/eyes/eyesFire_0000.png'],
      ['eyesFire1', './resources/eyes/eyesFire_0001.png'],
      ['eyesFire2', './resources/eyes/eyesFire_0002.png'],
      ['eyesFire3', './resources/eyes/eyesFire_0003.png'],
      ['eyesFire4', './resources/eyes/eyesFire_0004.png'],
      ['eyesFire5', './resources/eyes/eyesFire_0005.png'],
      ['eyesFire6', './resources/eyes/eyesFire_0006.png'],
    ]
  );

  const animator: Animator = animatorManager.animate();

  const playerController: PlayerController = new PlayerController(animator);

  return new PranDroidAnimationPlayer(animator, animatorManager, playerController);
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
            drawId('smile')
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
