import './index.css';
import { ActionType, AnimatorManager, ManagerTimelineAction } from 'pran-animation-frontend';
import { CanvasControllerFactory, phonemesMapper } from 'pran-phonemes-frontend';
import { createBlockEditor } from './components/block-editor/block-editor';
import { Container } from './components/container/container';
import { Player } from './components/player/player';
import { createTimelineBoard } from './components/timeline-board/timeline-board';
import { PlayerController } from './services/player-controller';

const draw = (id: string): ManagerTimelineAction => ({ type: ActionType.Draw, imageId: id });
const clear = (): ManagerTimelineAction => ({ type: ActionType.Clear });
const wait = (amount: number): ManagerTimelineAction => ({ type: ActionType.None, amount });

document.addEventListener('DOMContentLoaded', async () => {
  const player = new Player();
  const body: Container = Container.CreateBody();
  const topSection: Container = Container.CreateEmptyElement(body, 'section', 'top-section');
  const topLeftContainer: Container = Container.CreateEmptyElement(topSection, 'div', 'top-left-container');
  const playerContainer: Container = Container.CreateEmptyElement(topSection, 'div', 'player-container');
  const context = (player.canvas.componentElement as HTMLCanvasElement).getContext('2d');
  const editControlsContainer: Container = Container.CreateEmptyElement(topSection, 'div', 'edit-controls-container');

  const bottomSection: Container = Container.CreateEmptyElement(body, 'section', 'bottom-section');

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

  const playerController = new PlayerController(animator);
  playerController.setFps(60);
  // playerController.play();
  
  player.setInput('playerController', playerController)
    .appendTo(playerContainer);
  
  createTimelineBoard().setInputs({ animator, playerController, frameWidth: 20 })
    .appendTo(bottomSection);
  
  createBlockEditor().appendTo(editControlsContainer);

  body.render();
});
