import { Animator, AnimatorManager } from 'pran-animation-frontend';
import { PlayerController } from '../player-controller';

export interface AnimationRun {
  animateWith(animator: Animator, animatorManager: AnimatorManager, playerController: PlayerController): Promise<void>;
  stop(): void;
}