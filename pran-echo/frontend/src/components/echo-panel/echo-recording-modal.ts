import './echo-recording-modal.css';
import { Animator, AnimatorManager } from 'pran-animation-frontend';
import { CanvasControllerFactory } from 'pran-phonemes-frontend';
import { inlineComponent } from '../../framework/inline-component';
import { onClick } from '../../framework/on-click';
import { PlayerController, PlayerState } from '../../services/player-controller';
import { Container } from '../container/container';
import { ModalContentInputs } from '../modal-template/modal-template';
import { Player } from '../player/player';

type EchoRecordingModalInputs = { animatorManager: AnimatorManager, animator: Animator } & ModalContentInputs<void>;

export const createEchoRecordingModal = inlineComponent<EchoRecordingModalInputs>(controls => {
  controls.setup('echo-recording-modal', 'echo-recording-modal');
  let isInitialised: boolean = false,
    animatorManager: AnimatorManager,
    animator: Animator,
    canvas: HTMLCanvasElement,
    playerController: PlayerController;
  const player = new Player();
  player.setInput('showControls', false);
  const playerContainer = Container.CreateEmptyElement('div', 'echo-recording-modal_player-container');

  controls.onInputsChange = inputs => {
    if (isInitialised) return;
    isInitialised = true;

    canvas = player.canvas.componentElement as HTMLCanvasElement;
    const context2D = canvas.getContext('2d');
    const canvasController = CanvasControllerFactory.createFrom(context2D);
    animatorManager = inputs.animatorManager.cloneInNewCanvas(canvasController);
    animator = animatorManager.copyAnimatorFrom(inputs.animator);
    playerController = new PlayerController(animator);
    player.setInput('playerController', playerController);
    playerContainer.append(player);
  };

  return () => [[
    playerContainer,
    `<button type="button" class="echo-recording-modal_record-button g-button">Record</button>`
  ], e => (
    onClick(e, '.echo-recording-modal_record-button', () => startRecording(canvas, playerController, 60))
  )];
});

async function startRecording(canvas: HTMLCanvasElement, playerController: PlayerController, fps: number) {
  const stream = canvas.captureStream(fps) as MediaStream;
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
  playAnimationWithGoodQuality(canvas, playerController);

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

function stopMediaRecorder(mediaRecorder: MediaRecorder) {
  // Wait an enough amount of time for the last frame to be recorder
  setTimeout(() => {
    mediaRecorder.stop();
  }, 1000);
}

function playAnimationWithGoodQuality(canvas: HTMLCanvasElement, playerController: PlayerController) {
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
    playerController.play();
  }, 1000)
}