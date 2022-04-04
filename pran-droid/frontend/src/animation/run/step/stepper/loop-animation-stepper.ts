import { PranDroidAnimation } from '../../pran-droid-animation';
import { PranDroidAnimationStepper } from './pran-droid-animation-stepper';

export class LoopAnimationStepper implements PranDroidAnimationStepper {
  private _animation: PranDroidAnimation;

  public static create(animation: PranDroidAnimation): LoopAnimationStepper {
    const loop = new LoopAnimationStepper();
    loop._animation = animation;

    return loop;
  }

  public nextStep(): PranDroidAnimation | null {
    return this._animation;
  }
}