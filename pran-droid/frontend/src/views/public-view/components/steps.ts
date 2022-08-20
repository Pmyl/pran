import { inlineComponent } from 'pran-gular-frontend';
import { isNullOrUndefined } from '../../../helpers/is-null-or-undefined';
import { ReactionStep, ReactionTalkingStep, ReactionTalkingStepAlternative } from '../models';
import './steps.css';

export const steps = inlineComponent<{ steps: Array<ReactionStep> }>(controls => {
  controls.setup("reactions-table-steps", "reactions-table-steps");
  controls.setComplexRendering();

  function getReactionToShow(steps: Array<ReactionStep>): ReactionStep | undefined {
    const firstTalkingStep = steps.find(step => step.type === 'Talking');

    if (!firstTalkingStep) {
      return steps[0];
    }

    return firstTalkingStep;
  }

  function getMostProbableAlternative(talkingStep: ReactionTalkingStep): ReactionTalkingStepAlternative {
    return talkingStep.alternatives.reduce((mostProbable, alternative) => {
        if (!mostProbable || (alternative.probability || alternative._calculatedProbability) > (mostProbable.probability || mostProbable._calculatedProbability)) return alternative;
        return mostProbable;
      }, null);
  }

  return (inputs, r) => {
    controls.mandatoryInput("steps");
    const stepToShow: ReactionStep | undefined = getReactionToShow(inputs.steps);

    if (!stepToShow) {
      r.el('i').text('No steps defined').endEl();
    } else if (stepToShow.type === 'Moving') {
      r.text('Animation');
    } else {
      const mostProbableMessage = getMostProbableAlternative(stepToShow);
      r.el('p', 'reactions-table-steps_message').text(mostProbableMessage.message.text).endEl();
      stepToShow.alternatives.length !== 1 && mostProbableMessage.probability !== 100
        && r.el('span', 'reactions-table-steps_random').attr('title', 'Random response').html('&nbsp;🔀&nbsp;').endEl();
      inputs.steps.length > 1
        && r.scel('br').el('i', 'reactions-table-steps_more').text(`and ${inputs.steps.length - 1} more steps`).endEl();
    }
  };
});
