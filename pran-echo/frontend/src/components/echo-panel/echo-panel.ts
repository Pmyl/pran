import {
  Modal,
  PlayerState,
  PranEditorControls
} from 'pran-animation-editor-frontend';
import { ActionType, drawId, ManagerTimelineAction, wait } from 'pran-animation-frontend';
import { ComponentControls, inlineComponent, onChange, onClick } from 'pran-gular-frontend';
import { phonemesMapper } from 'pran-phonemes-frontend';
import './echo-panel.css';
import { MouthMapping } from '../../mapping/mouth-mapping';
import { createCustomMapping } from '../custom-mapping/custom-mapping';
import { createEchoRecordingModal } from './echo-recording-modal';
import { setupInitialAnimation } from './initial-animation';

const TO_FRAMES: number = 60;
const TO_SECONDS: number = 1 / 60;

interface EchoPanelSideInputs {
  audioFile: File;
  audio: Audio;
  text: string;
  phonemes: string[][];
  seconds: number;
  isLoading: boolean;
}

type EchoPanelInputs = PranEditorControls & { mouthMapping: MouthMapping };

type EchoPanelControls = ComponentControls<EchoPanelInputs, EchoPanelSideInputs>

interface AudioData {
  duration: number;
  transcript: string;
  words: Array<{
    word: string;
    start: number;
    end: number;
    phones: Array<{
      duration: number;
      phone: string;
    }>;
  }>;
}

type Audio = AudioData & { controls: HTMLAudioElement; };

export const createEchoPanel = inlineComponent<EchoPanelInputs, EchoPanelSideInputs>(controls => {
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
    inputs.animatorManager
      && inputs.animator
      && inputs.mouthMapping
      && setupInitialAnimation(inputs.animatorManager, inputs.animator, inputs.mouthMapping);
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
  <header class="echo-panel_header">
    <h1 class="echo-panel_title">Pran Echo</h1>
    <div class="echo-panel_header-button-container">
        <button type="button" class="echo-panel_header-button g-button g-button-s">Customise</button>
    </div>
  </header>
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
      onClick(e, '.echo-panel_record', () => recordVideo(inputs)),
      onClick(e, '.echo-panel_header-button', () => openCustomMappingModal(inputs))
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

async function uploadText(audioFile: File, text: string, seconds: number, controls: EchoPanelControls, inputs: EchoPanelInputs) {
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

async function uploadAudio(filesChange: Event & { target: HTMLInputElement }, audioElement: HTMLAudioElement, controls: EchoPanelControls, echoInputs: EchoPanelInputs): Promise<void> {
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

  updateAnimationAndData(response, controls, echoInputs);

  controls.setSideInput('isLoading', false);
  controls.changed();
}

function updateAnimationAndData(audioData: AudioData, controls: EchoPanelControls, echoInputs: EchoPanelInputs) {
  const convertToMouthPosition = (phoneme: string) => phonemesMapper([phoneme], echoInputs.mouthMapping.getPhonemeToIdsMap());

  const normalisePhoneme = (phoneme: string) => phoneme.match(/^(\w*)_/)[1].toUpperCase();

  let leftoverTime: number = 0;
  let lastEnd: number = 0;

  const mouthAnimations: Array<ManagerTimelineAction> = audioData.words.flatMap(wordData => {
    const waitBeforeInFrames: number = Math.floor((leftoverTime + wordData.start - lastEnd) * TO_FRAMES);
    leftoverTime = leftoverTime + wordData.start - lastEnd - waitBeforeInFrames * TO_SECONDS;
    lastEnd = wordData.end;

    let waitFrames: Array<ManagerTimelineAction> = [];

    if (waitBeforeInFrames > 11) {
      waitFrames = [wait(10), drawId('smile'), wait(waitBeforeInFrames - 10)];
    } else if (waitBeforeInFrames > 0) {
      waitFrames = [wait(waitBeforeInFrames)];
    }

    return [...waitFrames, ...wordData.phones.flatMap(phoneData => {
      const durationInFrames: number = Math.floor((leftoverTime + phoneData.duration) * TO_FRAMES);
      leftoverTime = leftoverTime + phoneData.duration - durationInFrames * TO_SECONDS;

      const phoneme = normalisePhoneme(phoneData.phone);
      const mouthPositions = convertToMouthPosition(phoneme);
      return ([
        ...mouthPositions.map(mouthPosition => drawWithMetadata(mouthPosition.output, {
          id: mouthPosition.output,
          phoneme: phoneme,
          word: wordData.word
        })),
        ...(durationInFrames - mouthPositions.length > 0 ? [wait(durationInFrames - mouthPositions.length)] : [])
      ]);
    })];
  });

  const endWaitInFrames: number = Math.floor((audioData.duration - lastEnd) * TO_FRAMES);
  if (endWaitInFrames > 1) {
    mouthAnimations.push(drawId('smile'));
    mouthAnimations.push(wait(endWaitInFrames - 1));
  }

  if (mouthAnimations[0].type === ActionType.None) {
    if (mouthAnimations[0].amount > 1) {
      mouthAnimations[0].amount--;
    } else {
      mouthAnimations.shift();
    }

    mouthAnimations.unshift(drawId('smile'));
  }

  const totalDurationInFrames: number = audioData.duration * TO_FRAMES;

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

  echoInputs.animatorManager.animate(echoInputs.animator,
    mouthAnimations,
    eyesAnimations,
    [
      drawId('head_idle')
    ]
  );

  controls.setSideInput('text', audioData.transcript);
  controls.setSideInput('phonemes', audioData.words.map(w => w.phones.map(p => normalisePhoneme(p.phone))));
  controls.setSideInput('seconds', audioData.duration);
  controls.changed();
}

function openCustomMappingModal(inputs: EchoPanelInputs): void {
  Modal.open(createCustomMapping({ mouthMapping: inputs.mouthMapping }));
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
