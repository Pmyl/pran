import { ActionType, Animator, AnimatorManager, ManagerTimelineAction } from 'pran-animation-frontend';
import { cmuPhonemesMap, phonemesMapper } from 'pran-phonemes-frontend';

const draw = (id: string): ManagerTimelineAction => ({ type: ActionType.Draw, imageId: id });
const clear = (): ManagerTimelineAction => ({ type: ActionType.Clear });
const wait = (amount: number): ManagerTimelineAction => ({ type: ActionType.None, amount });

export const setupInitialAnimation = (animatorManager: AnimatorManager, animator: Animator) => {
  const mouthMovementsImagesIds = phonemesMapper('HH EH L OW , M AY N EY M ZH P R AH N EH S AH .'.split(' '), {
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
    mouthMovementsImagesIds.flatMap(id => (
      [draw(id), wait(5)]
    )),
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
    [
      draw('head_idle'),
    ]
  );
}