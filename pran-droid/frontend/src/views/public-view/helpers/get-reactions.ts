import { retryFetch } from '../../../helpers/retry-fetch';
import { PranDroidReactionDefinition, PranDroidReactionDefinitions } from '../models';
import { fixReactionProbabilities } from './fix-reaction-probabilities';

export async function getReactions() {
  const reactions: PranDroidReactionDefinitions = await retryFetch("/api/reactions")
    .then(r => r.json())
    .then(r => r.data);

  reactions.forEach(reaction => {
    fixReactionProbabilities(reaction);
  });

  return reactions;
}

export async function getReaction(reactionId: string) {
  const reaction: PranDroidReactionDefinition = await retryFetch(`/api/reactions/${reactionId}`).then(r => r.json());
  fixReactionProbabilities(reaction);
  return reaction;
}
