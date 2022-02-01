import {
  ComponentControls,
  inlineComponent,
  Modal,
  onChange,
  onClick,
  PlayerState,
  PranEditorControls
} from 'pran-animation-editor-frontend';
import { ActionType, drawId, ManagerTimelineAction, wait } from 'pran-animation-frontend';
import { cmuPhonemesMap, phonemesMapper } from 'pran-phonemes-frontend';
import './echo-panel.css';
import { createEchoRecordingModal } from './echo-recording-modal';
import { setupInitialAnimation } from './initial-animation';

interface EchoPanelSideInputs {
  audioFile: File;
  audio: Audio;
  text: string;
  phonemes: string[][];
  seconds: number;
  isLoading: boolean;
}

type EchoPanelControls = ComponentControls<PranEditorControls, EchoPanelSideInputs>

interface AudioData {
  transcript: string;
  words: Array<{
    alignedWord: string;
    end: number;
    start: number;
    word: string;
    phones: Array<{
      duration: number;
      phone: string;
    }>;
  }>;
}

type Audio = AudioData & { controls: HTMLAudioElement; };

export const createEchoPanel = inlineComponent<PranEditorControls, EchoPanelSideInputs>(controls => {
  controls.setup('echo-panel', 'echo-panel');
  let audio: Audio,
    audioFile: File,
    text: string,
    phonemes: string,
    seconds: number,
    isLoading: boolean;

  controls.onInputChange = {
    playerController: playerController => {
      playerController.onStateChange(async state => {
        if (!audio) return;

        switch (state) {
          case PlayerState.Play:
            audio.controls.playbackRate = playerController.playbackRate;
            await audio.controls.play();
            break;
          case PlayerState.Stop:
          case PlayerState.End:
            audio.controls.pause();
            audio.controls.currentTime = 0;
            break;
          case PlayerState.Pause:
            audio.controls.pause();
            break;
        }
      });

      playerController.onFramePicked(frame => {
        if (!audio) return;

        audio.controls.currentTime = frame * (1 / playerController.fps);
      });
    }
  };
  
  controls.onSideInputChange = {
    audioFile: a => {
      audioFile = a;
    },
    audio: a => {
      audio = a;
    },
    text: t => {
      text = t;
    },
    phonemes: p => {
      phonemes = p.map(x => x.join('&nbsp;')).join(' • ');
    },
    seconds: s => {
      seconds = s;
    },
    isLoading: i => {
      isLoading = i;
    }
  };

  controls.onInputsChange = inputs => {
    setupInitialAnimation(inputs.animatorManager, inputs.animator);
  };

  return inputs => controls.mandatoryInput('animatorManager')
    && controls.mandatoryInput('animator')
    && [`
<div class="echo-panel_container">
  ${!isLoading ? '' : `
  <div class="echo-panel_loading-container">
    <div class="echo-panel_loading">Loading...</div>  
  </div>
  `}
  <h1 class="echo-panel_title">Pran Echo</h1>
  <input type="file" id="upload_audio_input" accept=".wav" hidden />
  <button class="echo-panel_upload-audio g-button" type="button">Upload audio</button>
  <audio class="echo-panel_audio"></audio>
  ${!audio ? '' : `
    <hr class="echo-panel_divider" />
    <div class="echo-panel_text-container">
        <label class="echo-panel_text-label">Sentence</label>
        <textarea class="echo-panel_text">${text}</textarea>
        <button type="button" class="echo-panel_upload-text g-button g-button-s">Update phonemes</button>
    </div>
    <div class="echo-panel_phonemes-container">
        <label class="echo-panel_phonemes-label">Phonemes</label>
        <p class="echo-panel_phonemes">${phonemes}</p>
    </div>
    <div class="echo-panel_seconds-container">
        <label class="echo-panel_seconds-label">Audio duration</label>
        <p class="echo-panel_seconds">${seconds.toFixed(2)} Seconds</p>
    </div>
  `}
  <div class="echo-panel_record-container">
    <button class="echo-panel_record g-button g-button-secondary" type="button">Record...</button>
  </div>
</div>
`,
    e => (
      onChange(e, "#upload_audio_input", change => uploadAudio(change, getAudio(e), controls, inputs)),
      onClick(e, '.echo-panel_upload-audio', () => triggerFileBrowse()),
      onClick(e, '.echo-panel_upload-text', () => uploadText(audioFile, getText(e), seconds, controls, inputs)),
      onClick(e, '.echo-panel_record', () => recordVideo(inputs))
    )
  ];
});

function getAudio(element: HTMLElement): HTMLAudioElement {
  return element.querySelector('.echo-panel_audio');
}

function getText(element: HTMLElement): string {
  return (element.querySelector('.echo-panel_text') as HTMLInputElement).value;
}

function recordVideo(editorControls: PranEditorControls): void {
  Modal.open(createEchoRecordingModal({
    animatorManager: editorControls.animatorManager,
    animator: editorControls.animator
  })); // on close raise a message "Done!"?
}

function triggerFileBrowse() {
  document.getElementById("upload_audio_input").click();
}

async function uploadText(audioFile: File, text: string, seconds: number, controls: EchoPanelControls, inputs: PranEditorControls) {
  controls.setSideInput('isLoading', true);
  controls.changed();
  const formData = new FormData();
  formData.append('text', text);
  formData.append('recording', audioFile);

  const response: AudioData = await (await fetch('/api/text/advanced', { method: 'POST', body: formData })).json();

  updateAnimationAndData(response, controls, inputs);
  controls.setSideInput('isLoading', false);
  controls.changed();
}

async function uploadAudio(filesChange: Event & { target: HTMLInputElement }, audioElement: HTMLAudioElement, controls: EchoPanelControls, editorControls: PranEditorControls): Promise<void> {
  controls.setSideInput('isLoading', true);
  controls.changed();

  const file = filesChange.target.files[0];
  controls.setSideInput('audioFile', file);

  const formData = new FormData();
  formData.append('recording', file);
  const response: AudioData = await (await fetch('/api/audio/advanced', { method: 'POST', body: formData })).json();

  const reader = new FileReader();
  reader.onload = function(e) {
    audioElement.src = e.target.result as string;
  };
  reader.readAsDataURL(file);
  controls.setSideInput('audio', { ...response, controls: audioElement });

  filesChange.target.value = '';

  updateAnimationAndData(response, controls, editorControls);

  controls.setSideInput('isLoading', false);
  controls.changed();
}

function updateAnimationAndData(audioData: AudioData, controls: EchoPanelControls, editorControls: PranEditorControls) {
  const convertToMouthPosition = (phoneme: string) => phonemesMapper([phoneme], {
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
    smile: 'smile'
  }, cmuPhonemesMap);

  const normalisePhoneme = (phoneme: string) => phoneme.match(/^(\w*)_/)[1].toUpperCase();

  let leftoverTime: number = 0;
  let lastEnd: number = 0;

  const mouthAnimations: Array<ManagerTimelineAction> = audioData.words.flatMap(wordData => {
    const waitBeforeInFrames: number = Math.floor((leftoverTime + wordData.start - lastEnd) / 0.0167);
    leftoverTime = leftoverTime + wordData.start - lastEnd - waitBeforeInFrames * 0.0167;
    lastEnd = wordData.end;

    let waitFrames: Array<ManagerTimelineAction> = [];

    if (waitBeforeInFrames > 11) {
      waitFrames = [wait(10), drawId('smile'), wait(waitBeforeInFrames - 10)];
    } else {
      waitFrames = [wait(waitBeforeInFrames)];
    }

    return [...waitFrames, ...wordData.phones.flatMap(phoneData => {
      const durationInFrames: number = Math.floor((leftoverTime + phoneData.duration) / 0.0167);
      leftoverTime = leftoverTime + phoneData.duration - durationInFrames * 0.0167;

      const phoneme = normalisePhoneme(phoneData.phone);
      const mouthPositions = convertToMouthPosition(phoneme);
      return ([
        ...mouthPositions.map(mouthPosition => drawWithMetadata(mouthPosition.output, {
          id: mouthPosition.output,
          phoneme: phoneme
        })),
        ...(durationInFrames - mouthPositions.length > 0 ? [wait(durationInFrames - mouthPositions.length)] : [])
      ]);
    })];
  });

  if (mouthAnimations[0].type === ActionType.None) {
    if (mouthAnimations[0].amount > 1) {
      mouthAnimations[0].amount--;
    } else {
      mouthAnimations.shift();
    }

    mouthAnimations.unshift(drawId('smile'));
  }

  const totalDurationInSeconds: number = audioData.words[audioData.words.length - 1].end;
  const totalDurationInFrames: number = totalDurationInSeconds / 0.0167;

  const eyesAnimations = Array(Math.floor(totalDurationInFrames / 114)).fill(null).flatMap(() => {
    return [
      drawId('eyes_open'),
      wait(100),
      drawId('eyes_semi_open'),
      wait(3),
      drawId('eyes_closed'),
      wait(3),
      drawId('eyes_semi_open'),
      wait(3),
      drawId('eyes_open')
    ];
  });

  editorControls.animatorManager.animate(editorControls.animator,
    mouthAnimations,
    eyesAnimations,
    [
      drawId('head_idle')
    ]
  );

  controls.setSideInput('text', audioData.transcript);
  controls.setSideInput('phonemes', audioData.words.map(w => w.phones.map(p => normalisePhoneme(p.phone))));
  controls.setSideInput('seconds', totalDurationInSeconds);
  controls.changed();
}

const drawWithMetadata = (id: string, metadata: { [key: string]: any }) => {
  const action: ManagerTimelineAction = drawId(id);
  action.metadata = metadata;
  return action;
}

declare global {
  interface HTMLCanvasElement {
    captureStream(frameRate?: number): MediaStream;
  }
}
