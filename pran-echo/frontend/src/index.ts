import './index.css';
import { ActionType, Animator, AnimatorManager, ManagerTimelineAction } from 'pran-animation-frontend';
import { CanvasControllerFactory, phonemesMapper } from 'pran-phonemes-frontend';
import { TimelineBar } from './components/timeline-bar';

const draw = (id: string): ManagerTimelineAction => ({ type: ActionType.Draw, imageId: id });
const clear = (): ManagerTimelineAction => ({ type: ActionType.Clear });
const wait = (amount: number): ManagerTimelineAction => ({ type: ActionType.None, amount });

document.addEventListener('DOMContentLoaded', async () => {
  const context = (document.getElementById('canvas') as HTMLCanvasElement).getContext('2d');
  const timelinesContainer = document.getElementById('timelines-container');
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
      draw('eyes_open'),
      wait(41),
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

  for (const timeline of animator.timelines) {
    const timelineBar = new TimelineBar(timeline, animator, timelinesContainer)
    timelineBar.frameWidth = 20;
    timelineBar.render();
  }

  startAnimation(animator, 60);
});

function startAnimation(animator: Animator, fps: number) {
  let fpsInterval, startTime, now, then, elapsed;

  (function startAnimating(fps) {
    fpsInterval = 1000 / fps;
    then = performance.now();
    startTime = then;
    animate();
  })(fps);

  function animate() {
    requestAnimationFrame(animate);
    now = performance.now();
    elapsed = now - then;
    if (elapsed > fpsInterval) {
      animator.tick();
      then = now - (elapsed % fpsInterval);
    }
  }
}