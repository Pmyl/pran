import './echo-recording-modal.css';
import {
  PlayerController,
  PlayerState
} from 'pran-animation-editor-frontend';
import { Animator, AnimatorManager, CanvasControllerFactory } from 'pran-animation-frontend';
import { BaseRendering, Container, inlineComponent, ModalContentInputs, onClick } from 'pran-gular-frontend';
import { webmToMp4 } from './webm-to-mp4';

type EchoRecordingModalInputs = { animatorManager: AnimatorManager, animator: Animator } & ModalContentInputs<void>;

export const createEchoRecordingModal = inlineComponent<EchoRecordingModalInputs>(controls => {
  controls.setup('echo-recording-modal', 'echo-recording-modal');
  let isInitialised: boolean = false,
    animatorManager: AnimatorManager,
    animator: Animator,
    canvas: HTMLCanvasElement,
    playerController: PlayerController;
  const canvasContainer = Container.CreateEmptyElement('canvas');
  (canvasContainer.componentElement as HTMLCanvasElement).width = 500;
  (canvasContainer.componentElement as HTMLCanvasElement).height = 500;
  const playerContainer = Container.CreateEmptyElement('div', 'echo-recording-modal_player-container')
    .append(canvasContainer);

  controls.onInputsChange = inputs => {
    if (isInitialised) return;
    isInitialised = true;

    canvas = canvasContainer.componentElement as HTMLCanvasElement;
    const context2D = canvas.getContext('2d');
    const canvasController = CanvasControllerFactory.createFrom(context2D);
    animatorManager = inputs.animatorManager.cloneInNewCanvas(canvasController);
    animator = animatorManager.copyAnimatorFrom(inputs.animator);
    playerController = new PlayerController(animator);
  };

  return () => [[
    playerContainer,
    `<button type="button" class="echo-recording-modal_record-button g-button">Record</button>`
  ], e => (
    onClick(e, '.echo-recording-modal_record-button', () => startRecording(canvas, playerController, animator, 60))
  )] as ReturnType<BaseRendering<EchoRecordingModalInputs>>;
});

async function startRecording(canvas: HTMLCanvasElement, playerController: PlayerController, animator: Animator, fps: number) {
  const stream = canvas.captureStream(fps);
  const recordedChunks = [];
  const options: MediaRecorderOptions = {
    mimeType: "video/webm; codecs=vp9",
    videoBitsPerSecond: 5000000
  };
  const mediaRecorder = new MediaRecorder(stream, options);
  mediaRecorder.ondataavailable = handleDataAvailable;
  mediaRecorder.onstop = download;
  playerController.setFps(fps);
  const unsubscribe = playerController.onStateChange(state => {
    if (state === PlayerState.End) {
      unsubscribe();
      stopMediaRecorder(mediaRecorder);
    }
  });
  mediaRecorder.start();
  playAnimationWithGoodQuality(canvas, playerController, animator);

  function handleDataAvailable(event) {
    recordedChunks.push(event.data);
  }

  async function download() {
    const mp4Buffer = await webmToMp4(new Blob(recordedChunks, { type: "video/wemb" }));
    const blob = new Blob([mp4Buffer], {
      type: "video/mp4"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    document.body.appendChild(a);
    (a as any).style = "display: none";
    a.href = url;
    a.download = "output.mp4";
    a.click();
    window.URL.revokeObjectURL(url);
  }
}

function stopMediaRecorder(mediaRecorder: MediaRecorder) {
  // Wait an enough amount of time for the last frame to be recorded
  setTimeout(() => {
    mediaRecorder.stop();
  }, 1000);
}

function playAnimationWithGoodQuality(canvas: HTMLCanvasElement, playerController: PlayerController, animator: Animator) {
  // Draw various colours to force media recorder to get their shit together and record with optimal quality
  const context = canvas.getContext('2d');
  setTimeout(() => {
    context.fillStyle = 'blue';
    context.fillRect(0, 0, 500, 500);
  }, 100);
  setTimeout(() => {
    context.fillStyle = 'red';
    context.fillRect(0, 0, 500, 500);
  }, 200);
  setTimeout(() => {
    context.fillStyle = 'yellow';
    context.fillRect(0, 0, 500, 500);
  }, 300);
  setTimeout(() => {
    context.fillStyle = 'green';
    context.fillRect(0, 0, 500, 500);
  }, 400);
  setTimeout(() => {
    context.fillStyle = 'blue';
    context.fillRect(0, 0, 500, 500);
  }, 500);
  setTimeout(() => {
    context.fillStyle = 'red';
    context.fillRect(0, 0, 500, 500);
  }, 600);
  setTimeout(() => {
    context.fillStyle = 'yellow';
    context.fillRect(0, 0, 500, 500);
  }, 700);
  setTimeout(() => {
    context.fillStyle = 'green';
    context.fillRect(0, 0, 500, 500);
  }, 800);
  setTimeout(() => {
    context.fillStyle = 'blue';
    context.fillRect(0, 0, 500, 500);
  }, 900);
  setTimeout(() => {
    playerController.pickFrame(0);
    animator.tick();
  }, 1000)
  setTimeout(() => {
    playerController.pickFrame(0);
    playerController.play();
  }, 2000)
}
