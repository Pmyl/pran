import { PranDroidAnimation } from '../../pran-droid-animation';

export interface PranDroidAnimationStepper {
  nextStep(): PranDroidAnimation | null;
}