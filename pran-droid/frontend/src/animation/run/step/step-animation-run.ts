import { Animator, AnimatorManager } from 'pran-animation-frontend';
import { PlayerController, PlayerState } from '../../player-controller';
import { AnimationRun } from '../animation-run';
import { PranDroidAnimation } from '../pran-droid-animation';
import { PranDroidAnimationStepper } from './stepper/pran-droid-animation-stepper';

export class StepAnimationRun implements AnimationRun {
  private _animationStepper: PranDroidAnimationStepper;
  private _stopStep?: () => void;
  private _stopped: boolean = false;

  public static animating(animationStepper: PranDroidAnimationStepper): StepAnimationRun {
    const step = new StepAnimationRun();
    step._animationStepper = animationStepper;

    return step;
  }

  public async animateWith(animator: Animator, animatorManager: AnimatorManager, playerController: PlayerController): Promise<void> {
    playerController.setLoop(false);

    for (let animation: PranDroidAnimation; !!(animation = this._animationStepper.nextStep()) && !this._stopped;) {
      await this._step(animation, animator, animatorManager, playerController);
    }
  }

  public stop(): void {
    this._stopStep?.();
  }

  private _step(animation: PranDroidAnimation, animator: Animator, animatorManager: AnimatorManager, playerController: PlayerController): Promise<unknown> {
    animatorManager.animate(animator, ...animation.layers);
    playerController.setFps(animation.fps);
    playerController.pickFrame(0);
    playerController.play();

    let resolveStep;
    const stepPromise = new Promise(r => resolveStep = r),
      unsubscribeCurrentStep = playerController.onStateChange((newState: PlayerState) => {
        if (newState === PlayerState.End) {
          resolveStep();
          unsubscribeCurrentStep();
        }
      });

    this._stopStep = () => {
      this._stopped = true;
      unsubscribeCurrentStep();
      resolveStep();
    };

    return stepPromise;
  }
}