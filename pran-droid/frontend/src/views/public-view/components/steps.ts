import { inlineComponent } from 'pran-gular-frontend';
import { ReactionStep, ReactionTalkingStepAlternative} from '../models';

export const steps = inlineComponent<{ steps: Array<ReactionStep> }>(controls => {
  controls.setup("steps", "steps");
  controls.setComplexRendering();

  function getReactionToShow(steps: Array<ReactionStep>): ReactionStep {
    const firstTalkingStep = steps.find(step => step.type === 'Talking');

    if (!firstTalkingStep) {
      return steps[0];
    }

    return firstTalkingStep;
  }

  function getMostProbableAlternative(talkingStep: ReactionStep): ReactionTalkingStepAlternative {
    return (talkingStep as { alternatives: Array<ReactionTalkingStepAlternative> })
      .alternatives.reduce((mostProbable, alternative) => {
        if (!mostProbable || alternative.probability > mostProbable.probability) return alternative;
        return mostProbable;
      }, null);
  }

  return (inputs, r) => {
    controls.mandatoryInput("steps");
    const stepToShow: ReactionStep = getReactionToShow(inputs.steps);

    if (stepToShow.type === 'Moving') {
      r.text('Animation');
    } else {
      const mostProbableMessage = getMostProbableAlternative(stepToShow);
      r.el('p', 'public-view_step-message').text(mostProbableMessage.message.text).endEl();
      mostProbableMessage.probability !== 100
        && r.el('span', 'public-view_step-random').attr('title', 'Random response').html('&nbsp;🔀&nbsp;').endEl();
      inputs.steps.length > 1
        && r.scel('br').el('span', 'public-view_step-more').text(`and ${inputs.steps.length - 1} more steps`).endEl();
    }
  };
});
