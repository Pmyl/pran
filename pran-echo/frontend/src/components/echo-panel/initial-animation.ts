import { ActionType, Animator, AnimatorManager, drawId, ManagerTimelineAction, wait } from 'pran-animation-frontend';
import { cmuPhonemesMap, phonemesMapper } from 'pran-phonemes-frontend';

export const setupInitialAnimation = (animatorManager: AnimatorManager, animator: Animator) => {
  const mouthMovementsMapping = phonemesMapper('HH EH L OW , M AY N EY M ZH P R AH N EH S AH .'.split(' '), {
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

  animatorManager.animate(
    animator,
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
}

const drawWithMetadata = (id: string, metadata: { [key: string]: any }) => {
  const action: ManagerTimelineAction = drawId(id);
  action.metadata = metadata;
  return action;
}