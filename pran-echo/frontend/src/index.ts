import './index.css';
import { ActionType, AnimatorManager, ManagerTimelineAction } from 'pran-animation-frontend';
import { CanvasControllerFactory, phonemesMapper } from 'pran-phonemes-frontend';
import { Container } from './components/container/container';
import { PauseButton } from './components/player/buttons/pause-button';
import { PlayButton } from './components/player/buttons/play-button';
import { ReplayButton } from './components/player/buttons/replay-button';
import { StopButton } from './components/player/buttons/stop-button';
import { LoopToggle } from './components/player/loop-toggle';
import { TimelineBar } from './components/timeline-bar/timeline-bar';
import { Player } from './services/player';

const draw = (id: string): ManagerTimelineAction => ({ type: ActionType.Draw, imageId: id });
const clear = (): ManagerTimelineAction => ({ type: ActionType.Clear });
const wait = (amount: number): ManagerTimelineAction => ({ type: ActionType.None, amount });

document.addEventListener('DOMContentLoaded', async () => {
  const topSection = Container.CreateEmptyElement(document.body, 'section', 'top-section');
  const canvas = Container.CreateEmptyElement(topSection, 'canvas');
  (canvas.componentElement as HTMLCanvasElement).width = 500;
  (canvas.componentElement as HTMLCanvasElement).height = 500;
  const context = (canvas.componentElement as HTMLCanvasElement).getContext('2d');
  const controlsContainer = Container.CreateEmptyElement(topSection, 'section', 'controls-container');

  const bottomSection = Container.CreateEmptyElement(document.body, 'section', 'bottom-section');
  const timelinesContainer = Container.CreateEmptyElement(bottomSection, 'section', 'timelines-container');

  const manager = await AnimatorManager.create(CanvasControllerFactory.createFrom(context), [
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
  ]);
  const mouthMovementsImagesIds = phonemesMapper('h ə l ʊ , m aɪ n eɪ m z p r ɑ: l æ s ɑ: .'.split(' '), {
    fv: 'fv',
    ur: 'ur',
    stch: 'stch',
    mbsilent: 'mbsilent',
    p1: 'p1',
    p2: 'p2',
    e: 'e',
    aah: 'aah',
    o: 'o',
    ld: 'ld',
    pause: 'pause',
    smile: 'smile',
  });

  const animator = manager.animate(
    [
      draw('head_idle'),
    ],
    [
      draw('eyes_open'),
      wait(20),
      draw('eyes_semi_open'),
      wait(3),
      draw('eyes_closed'),
      wait(3),
      draw('eyes_semi_open'),
      wait(3),
      draw('eyes_open'),
    ],
    mouthMovementsImagesIds.flatMap(id => (
      [draw(id), wait(5)]
    ))
  );

  const timelineBars = [];
  for (const timeline of animator.timelines) {
    const timelineBar = new TimelineBar(timeline, animator, timelinesContainer)
    timelineBar.frameWidth = 20;
    timelineBar.render();
    timelineBars.push(timelineBar);
  }

  const player = new Player(animator);
  player.setFps(60);
  player.play();

  const replayButton = new ReplayButton(controlsContainer, player);
  replayButton.render();

  const stopButton = new StopButton(controlsContainer, player);
  stopButton.render();

  const pauseButton = new PauseButton(controlsContainer, player);
  pauseButton.render();

  const playButton = new PlayButton(controlsContainer, player);
  playButton.render();

  const loopToggle = new LoopToggle(controlsContainer, player);
  loopToggle.render();
});
