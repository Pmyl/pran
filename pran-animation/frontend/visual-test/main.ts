import { CanvasControllerFactory, MainCanvasController, phonemesMapper } from 'pran-phonemes-frontend';
import { ActionType, Animator, AnimatorManager, PranTimelineAction } from '../src/';

document.addEventListener('DOMContentLoaded', async () => {
  const context = (document.getElementById('canvas') as HTMLCanvasElement).getContext('2d');
  const replayButton = document.getElementById('replay-button') as HTMLButtonElement;

  const controller = CanvasControllerFactory.createFrom(context);
  const animatorManager = await AnimatorManager.create(controller, [
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

    ['text_h', './resources/text/h.png'],
    ['text_he', './resources/text/he.png'],
    ['text_hell', './resources/text/hell.png'],
    ['text_hello', './resources/text/hello.png'],
    ['text_helloM', './resources/text/helloM.png'],
    ['text_helloMy', './resources/text/helloMy.png'],
    ['text_helloMyN', './resources/text/helloMyN.png'],
    ['text_helloMyNa', './resources/text/helloMyNa.png'],
    ['text_helloMyNam', './resources/text/helloMyNam.png'],
    ['text_helloMyName', './resources/text/helloMyName.png'],
    ['text_helloMyNameIs', './resources/text/helloMyNameIs.png'],
    ['text_helloMyNameIsP', './resources/text/helloMyNameIsP.png'],
    ['text_helloMyNameIsPr', './resources/text/helloMyNameIsPr.png'],
    ['text_helloMyNameIsPra', './resources/text/helloMyNameIsPra.png'],
    ['text_helloMyNameIsPran', './resources/text/helloMyNameIsPran.png'],
    ['text_helloMyNameIsPrane', './resources/text/helloMyNameIsPrane.png'],
    ['text_helloMyNameIsPraness', './resources/text/helloMyNameIsPraness.png'],
    ['text_helloMyNameIsPranessa', './resources/text/helloMyNameIsPranessa.png'],
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
  
  const animator = animatorManager.animate(
    [
      { type: ActionType.Draw, imageId: 'text_h' },
      { type: ActionType.None, amount: 5 },
      { type: ActionType.Draw, imageId: 'text_he' },
      { type: ActionType.None, amount: 5 },
      { type: ActionType.Draw, imageId: 'text_hell' },
      { type: ActionType.None, amount: 5 },
      { type: ActionType.Draw, imageId: 'text_hello' },
      { type: ActionType.None, amount: 5 },
      { type: ActionType.Draw, imageId: 'text_helloM' },
      { type: ActionType.None, amount: 5 },
      { type: ActionType.Draw, imageId: 'text_helloMy' },
      { type: ActionType.None, amount: 5 },
      { type: ActionType.Draw, imageId: 'text_helloMyN' },
      { type: ActionType.None, amount: 5 },
      { type: ActionType.Draw, imageId: 'text_helloMyNa' },
      { type: ActionType.None, amount: 5 },
      { type: ActionType.Draw, imageId: 'text_helloMyNam' },
      { type: ActionType.None, amount: 2 },
      { type: ActionType.Draw, imageId: 'text_helloMyName' },
      { type: ActionType.None, amount: 5 },
      { type: ActionType.Draw, imageId: 'text_helloMyNameIs' },
      { type: ActionType.None, amount: 5 },
      { type: ActionType.Draw, imageId: 'text_helloMyNameIsP' },
      { type: ActionType.None, amount: 5 },
      { type: ActionType.Draw, imageId: 'text_helloMyNameIsPr' },
      { type: ActionType.None, amount: 5 },
      { type: ActionType.Draw, imageId: 'text_helloMyNameIsPra' },
      { type: ActionType.None, amount: 5 },
      { type: ActionType.Draw, imageId: 'text_helloMyNameIsPran' },
      { type: ActionType.None, amount: 5 },
      { type: ActionType.Draw, imageId: 'text_helloMyNameIsPrane' },
      { type: ActionType.None, amount: 5 },
      { type: ActionType.Draw, imageId: 'text_helloMyNameIsPraness' },
      { type: ActionType.None, amount: 5 },
      { type: ActionType.Draw, imageId: 'text_helloMyNameIsPranessa' },
    ],
    [
      { type: ActionType.Draw, imageId: 'head_idle' },
    ],
    [
      { type: ActionType.Draw, imageId: 'eyes_open' },
      { type: ActionType.None, amount: 80 },
      { type: ActionType.Draw, imageId: 'eyes_semi_open' },
      { type: ActionType.None, amount: 2 },
      { type: ActionType.Draw, imageId: 'eyes_closed' },
      { type: ActionType.None, amount: 3 },
      { type: ActionType.Draw, imageId: 'eyes_semi_open' },
      { type: ActionType.None, amount: 2 },
      { type: ActionType.Draw, imageId: 'eyes_open' },
      { type: ActionType.None, amount: 30 },
      { type: ActionType.Draw, imageId: 'eyes_open' },
      { type: ActionType.None, amount: 30 },
      { type: ActionType.Draw, imageId: 'eyes_open' },
      { type: ActionType.None, amount: 30 },
      { type: ActionType.Draw, imageId: 'eyes_open' },
      { type: ActionType.None, amount: 30 },
      { type: ActionType.Draw, imageId: 'eyes_open' },
      { type: ActionType.None, amount: 30 },
      { type: ActionType.Draw, imageId: 'eyes_open' },
      { type: ActionType.None, amount: 30 },
      { type: ActionType.Draw, imageId: 'eyes_open' },
      { type: ActionType.None, amount: 30 },
      { type: ActionType.Draw, imageId: 'eyes_open' },
      { type: ActionType.None, amount: 30 },
      { type: ActionType.Draw, imageId: 'eyes_open' },
      { type: ActionType.None, amount: 30 },
      { type: ActionType.Draw, imageId: 'eyes_open' },
      { type: ActionType.None, amount: 30 },
      { type: ActionType.Draw, imageId: 'eyes_open' },
      { type: ActionType.None, amount: 30 },
      { type: ActionType.Draw, imageId: 'eyes_open' },
      { type: ActionType.None, amount: 30 },
      { type: ActionType.Draw, imageId: 'eyes_open' },
      { type: ActionType.None, amount: 30 },
      { type: ActionType.Draw, imageId: 'eyes_open' },
      { type: ActionType.None, amount: 30 },
      { type: ActionType.Draw, imageId: 'eyes_open' },
      { type: ActionType.None, amount: 30 },
      { type: ActionType.Draw, imageId: 'eyes_open' },
      { type: ActionType.None, amount: 30 },
      { type: ActionType.Draw, imageId: 'eyes_open' },
      { type: ActionType.None, amount: 30 },
      { type: ActionType.Draw, imageId: 'eyes_open' },
      { type: ActionType.None, amount: 30 },
      { type: ActionType.Draw, imageId: 'eyes_open' },
      { type: ActionType.None, amount: 30 },
      { type: ActionType.Draw, imageId: 'eyes_open' },
      { type: ActionType.None, amount: 30 },
      { type: ActionType.Draw, imageId: 'eyes_open' },
      { type: ActionType.None, amount: 30 },
      { type: ActionType.Draw, imageId: 'eyes_open' },
      { type: ActionType.None, amount: 30 },
      { type: ActionType.Draw, imageId: 'eyes_open' },
      { type: ActionType.None, amount: 30 },
      { type: ActionType.Draw, imageId: 'eyes_open' },
      { type: ActionType.None, amount: 30 },
      { type: ActionType.Draw, imageId: 'eyes_open' },
      { type: ActionType.None, amount: 30 },
      { type: ActionType.Draw, imageId: 'eyes_open' },
      { type: ActionType.None, amount: 30 },
      { type: ActionType.Draw, imageId: 'eyes_open' },
    ],
    mouthMovementsImagesIds.reduce((animation: PranTimelineAction[], imageId: string) => {
      animation.push({ type: ActionType.Draw, imageId: imageId });
      animation.push({ type: ActionType.None, amount: 5 });
      return animation;
    }, []));
  
  replayButton.addEventListener('click', () => {
    animator.restart();
  });
  // startRecording(context.canvas, controller, 60)
  startAnimation(animator, 60);
});

function startRecording(canvas: any, controller: MainCanvasController, fps: number) {
  const stream = canvas.captureStream(fps) as MediaStream;
  const recordedChunks = [];
  const options = { mimeType: "video/webm; codecs=vp9" };
  const mediaRecorder = new MediaRecorder(stream, options);
  mediaRecorder.ondataavailable = handleDataAvailable;
  mediaRecorder.onstop = download;
  mediaRecorder.start();
  setTimeout(() => {
    console.log("stopping");
    controller.redraw();
    setTimeout(() => {
      mediaRecorder.stop();
    }, 10);
  }, 5000);

  function handleDataAvailable(event) {
    recordedChunks.push(event.data);
  }

  function download() {
    const blob = new Blob(recordedChunks, {
      type: "video/webm"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    document.body.appendChild(a);
    (a as any).style = "display: none";
    a.href = url;
    a.download = "test.webm";
    a.click();
    window.URL.revokeObjectURL(url);
  }
}

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