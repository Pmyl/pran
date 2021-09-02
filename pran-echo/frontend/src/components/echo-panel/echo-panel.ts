import {
  ComponentControls,
  inlineComponent,
  Modal,
  onChange,
  onClick,
  PlayerState,
  PranEditorControls
} from 'pran-animation-editor-frontend';
import { drawId, ManagerTimelineAction, wait } from 'pran-animation-frontend';
import { cmuPhonemesMap, phonemesMapper } from 'pran-phonemes-frontend';
import './echo-panel.css';
import { createEchoRecordingModal } from './echo-recording-modal';
import { setupInitialAnimation } from './initial-animation';

interface EchoPanelSideInputs {
  audio: Audio;
  text: string;
  phonemes: string[][];
  seconds: number;
  isLoading: boolean;
}

type EchoPanelControls = ComponentControls<PranEditorControls, EchoPanelSideInputs>

interface AudioData {
  phonemes: string[][];
  text: string;
  seconds: number;
}

type Audio = AudioData & { controls: HTMLAudioElement; };

export const createEchoPanel = inlineComponent<PranEditorControls, EchoPanelSideInputs>(controls => {
  controls.setup('echo-panel', 'echo-panel');
  let audio: Audio,
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
  <input type="file" id="upload_audio_input" hidden />
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
    <button class="echo-panel_record g-button" type="button">Record...</button>
  </div>
</div>
`,
    e => (
      onChange(e, "#upload_audio_input", change => uploadAudio(change, getAudio(e), controls, inputs)),
      onClick(e, '.echo-panel_upload-audio', () => triggerFileBrowse()),
      onClick(e, '.echo-panel_upload-text', () => uploadText(getText(e), seconds, controls, inputs)),
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

async function uploadText(text: string, seconds: number, controls: EchoPanelControls, inputs: PranEditorControls) {
  controls.setSideInput('isLoading', true);
  controls.changed();
  const formData = new FormData();
  formData.append('text', text);

  const response: { text: string, phonemes: string[][] } = await (await fetch('/api/text', { method: 'POST', body: formData })).json();

  updateAnimationAndData({ text, phonemes: response.phonemes, seconds }, controls, inputs);
  controls.setSideInput('isLoading', false);
  controls.changed();
}

async function uploadAudio(filesChange: Event & { target: HTMLInputElement }, audioElement: HTMLAudioElement, controls: EchoPanelControls, editorControls: PranEditorControls): Promise<void> {
  controls.setSideInput('isLoading', true);
  controls.changed();

  const file = filesChange.target.files[0];

  const formData = new FormData();
  formData.append('recording', file);
  const response: AudioData = await (await fetch('/api/audio', { method: 'POST', body: formData })).json();

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
  const mouthMovementsMapping = phonemesMapper(audioData.phonemes.flatMap(x => x), {
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

  editorControls.animatorManager.animate(editorControls.animator,
    mouthMovementsMapping.flatMap(mapping => (
      [drawWithMetadata(mapping.output, { id: mapping.output, phoneme: mapping.phoneme }), wait(5)]
    )),
    [
      drawId('eyes_open'),
      wait(20),
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
  );

  controls.setSideInput('text', audioData.text);
  controls.setSideInput('phonemes', audioData.phonemes);
  controls.setSideInput('seconds', audioData.seconds);
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
