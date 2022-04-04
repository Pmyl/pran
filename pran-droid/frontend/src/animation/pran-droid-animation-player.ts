import { Animator, AnimatorManager } from 'pran-animation-frontend';
import { PlayerController } from './player-controller';
import { AnimationRun } from './run/animation-run';

export class PranDroidAnimationPlayer {
  private readonly _animator: Animator;
  private readonly _animatorManager: AnimatorManager;
  private readonly _playerController: PlayerController;
  private _lastRun?: AnimationRun;

  constructor(animator: Animator, animatorManager: AnimatorManager, playerController: PlayerController) {
    this._animator = animator;
    this._animatorManager = animatorManager;
    this._playerController = playerController;
  }

  public async play(run: AnimationRun): Promise<void> {
    this._lastRun?.stop();
    this._playerController.stop();
    this._lastRun = run;
    await run.animateWith(this._animator, this._animatorManager, this._playerController);
  }
}