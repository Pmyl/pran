import { PranDroidAnimation } from '../../pran-droid-animation';
import { PranDroidAnimationStepper } from './pran-droid-animation-stepper';

export class SingleAnimationStepper implements PranDroidAnimationStepper {
  private _hasDoneStep: boolean = false;
  private _animation: PranDroidAnimation;

  public static create(animation: PranDroidAnimation): SingleAnimationStepper {
    const singleAnimationStepper = new SingleAnimationStepper();
    singleAnimationStepper._animation = animation;

    return singleAnimationStepper;
  }

  public nextStep(): PranDroidAnimation | null {
    if (!this._hasDoneStep) {
      this._hasDoneStep = true;
      return this._animation;
    }

    return null;
  }
}