import { PranDroid } from '../droid/droid';
import { reactionToPranDroidSteps } from './response-parsers';

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
    pranDroid.react(reactionToPranDroidSteps(reaction));
  }
}

export async function simulateBrainRedeem(pranDroid: PranDroid, id: string) {
  const reaction = await fetch(
    `/api/brain/simulation/action`,
    {
      method: 'POST',
      body: JSON.stringify({ id, name: 'reward_redeem', isMod: true, userName: 'pranessa' }),
      headers: { 'Content-Type': 'application/json' }
    })
    .then(x => x.json());

  if (!!reaction) {
    pranDroid.react(reactionToPranDroidSteps(reaction));
  }
}