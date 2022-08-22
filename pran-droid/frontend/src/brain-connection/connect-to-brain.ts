import { PranDroid } from '../droid/droid';
import { BrainWebSocket } from './brain-web-socket';
import { reactionToSteps } from './response-parsers';

export function connectToBrain(pranDroid: PranDroid) {
  new BrainWebSocket(reaction => pranDroid.react(reactionToSteps(reaction)));
}