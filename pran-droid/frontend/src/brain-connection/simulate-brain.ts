import { PranDroid } from '../droid/droid';
import { reactionToSteps } from './response-parsers';

export async function simulateBrainMessage(pranDroid: PranDroid, message: string) {
  const reaction = await fetch(
    `/api/brain/simulation/message`,
    {
      method: 'POST',
      body: JSON.stringify({ text: message, isMod: true, userName: 'pranessa' }),
      headers: { 'Content-Type': 'application/json' }
    })
    .then(x => x.json());

  if (!!reaction) {
    pranDroid.react(reactionToSteps(reaction));
  }
}