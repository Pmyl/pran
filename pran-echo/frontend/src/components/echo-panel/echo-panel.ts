import { ActionType, Animator, AnimatorManager, ManagerTimelineAction } from 'pran-animation-frontend';
import { cmuPhonemesMap, phonemesMapper } from 'pran-phonemes-frontend';
import { inlineComponent } from '../../framework/inline-component';
import { onChange } from '../../framework/on-change';
import { onClick } from '../../framework/on-click';

export const createEchoPanel = inlineComponent<{ animator: Animator, animatorManager: AnimatorManager }>(controls => {
  controls.setup('echo-panel', 'echo-panel');

  // controls.onInputsChange = inputs => {
  //   const mouthMovementsImagesIds = phonemesMapper('HH EH L OW , M AY N EY M ZH P R AH N EH S AH .'.split(' '), {
  //     fv: 'fv',
  //     ur: 'ur',
  //     stch: 'stch',
  //     mbsilent: 'mbsilent',
  //     p1: 'p1',
  //     p2: 'p2',
  //     e: 'e',
  //     aah: 'aah',
  //     o: 'o',
  //     ld: 'ld',
  //     pause: 'pause',
  //     smile: 'smile',
  //   }, cmuPhonemesMap);
  //
  //   inputs.animatorManager.animate(
  //     inputs.animator,
  //     [
  //       draw('head_idle'),
  //     ],
  //     [
  //       draw('eyes_open'),
  //       wait(20),
  //       draw('eyes_semi_open'),
  //       wait(3),
  //       draw('eyes_closed'),
  //       wait(3),
  //       draw('eyes_semi_open'),
  //       wait(3),
  //       draw('eyes_open'),
  //     ],
  //     mouthMovementsImagesIds.flatMap(id => (
  //       [draw(id), wait(5)]
  //     ))
  //   );
  // };

  return inputs => controls.mandatoryInput('animatorManager')
    && controls.mandatoryInput('animator')
    && [`
<div>
  I'm the echo panel
  <input type="file" id="upload_audio_input" hidden />
  <button class="editor_upload-audio" type="button">Upload audio</button>
</div>
`,
    e => (onChange(e, "#upload_audio_input", change => uploadAudio(change, inputs.animator, inputs.animatorManager)),
        onClick(e, '.editor_upload-audio', () => triggerFileBrowse()))
  ];
});

const draw = (id: string): ManagerTimelineAction => ({ type: ActionType.Draw, imageId: id });
const clear = (): ManagerTimelineAction => ({ type: ActionType.Clear });
const wait = (amount: number): ManagerTimelineAction => ({ type: ActionType.None, amount });

function triggerFileBrowse() {
  document.getElementById("upload_audio_input").click();
}

async function uploadAudio(filesChange: Event & { target: HTMLInputElement }, animator: Animator, manager: AnimatorManager) {
  const file = filesChange.target.files[0];
  const formData = new FormData();
  formData.append('recording', file);

  const response: { phonemes: string, text: string } = await (await fetch('/api/audio', { method: 'POST', body: formData })).json();

  filesChange.target.value = '';

  const mouthMovementsImagesIds = phonemesMapper(response.phonemes.split(' '), {
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
  }, cmuPhonemesMap);

  manager.animate(animator,
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
}
