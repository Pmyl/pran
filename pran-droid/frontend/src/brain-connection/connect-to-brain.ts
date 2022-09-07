import { PranDroid } from '../droid/droid';
import { BrainWebSocket } from './brain-web-socket';
import { reactionToPranDroidSteps } from './response-parsers';

export function connectToBrain(pranDroid: PranDroid) {
  new BrainWebSocket(reaction => pranDroid.react(reactionToPranDroidSteps(reaction)));
}