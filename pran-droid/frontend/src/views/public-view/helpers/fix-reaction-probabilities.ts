import { isNullOrUndefined } from '../../../helpers/is-null-or-undefined';
import { PranDroidReactionDefinition, ReactionStep } from '../models';

export function fixReactionProbabilities(reaction: PranDroidReactionDefinition) {
  reaction.steps.forEach(fixStepProbabilities);
  return reaction;
}

export function fixStepProbabilities(step: ReactionStep) {
  if (step.type === 'Talking') {
    const nullProbabilities = step.alternatives.filter((alternative) => isNullOrUndefined(alternative.probability)).length;
    const setProbability = step.alternatives
      .filter((alternative) => !isNullOrUndefined(alternative.probability))
      .reduce((sum, alternative) => sum + alternative.probability, 0);
    const remainingProbability = 100 - setProbability;

    step.alternatives.forEach(alternative => {
      if (alternative.probability === null) {
        alternative._calculatedProbability = (remainingProbability / nullProbabilities).toFixed(0);
      } else {
        alternative._calculatedProbability = null;
      }
    });
  }

  return step;
}