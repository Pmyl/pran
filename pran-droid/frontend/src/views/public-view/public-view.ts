import { drawId, wait } from 'pran-animation-frontend';
import { inlineComponent } from 'pran-gular-frontend';
import { randomFramesBetweenInMs } from '../../animation/helpers/random';
import { AnimationRun } from '../../animation/run/animation-run';
import { StepAnimationRun } from '../../animation/run/step/step-animation-run';
import { retryFetch } from '../../helpers/retry-fetch';
import './public-view.css';

type PranDroidReactionDefinitions = Array<PranDroidReactionDefinition>;

interface PranDroidReactionDefinition {
  count: number,
  isDisabled: boolean,
  triggers: Array<{ type: 'ChatCommand', command: string } | { type: 'ChatKeyword', keyword: string }>,
  steps: Array<
    { type: 'Talking', alternatives: Array<{ message: { text: string }, probability: number }> } |
    { type: 'Moving' }
  >
}

function printTrigger(trigger: PranDroidReactionDefinition['triggers'][number]) {
  return trigger.type === 'ChatCommand' ?
`<span class="public-view_command" title="Command, use this at the beginning of your message to trigger the reaction">${trigger.command}</span>` :
`<span class="public-view_keyword" title="Keyword, use this anywhere in your message to trigger the reaction">${trigger.keyword}</span>`;
}

function printTriggers(reaction: PranDroidReactionDefinition) {
  if (reaction.triggers.length > 1) {
    return `
${printTrigger(reaction.triggers[0])} and
<span class="public-view_tooltip"> ${reaction.triggers.length - 1} more
  <span class="public-view_tooltip-content">${reaction.triggers.map(printTrigger).join('<br />')}</span>
</span>`;
  } else {
    return printTrigger(reaction.triggers[0]);
  }
}

function printSteps(reaction: PranDroidReactionDefinition) {
  const firstTalkingStep = reaction.steps.find(step => step.type === 'Talking');

  if (!firstTalkingStep) {
    return 'Animation';
  }

  const mostProbableMessage = (firstTalkingStep as { alternatives: Array<{ message: { text: string }, probability: number }> }).alternatives.reduce((mostProbable, alternative) => {
    if (!mostProbable || alternative.probability > mostProbable.probability) return alternative;
    return mostProbable;
  }, null);

  return `
<p class="public-view_step-message">${mostProbableMessage.message.text}</p>
${mostProbableMessage.probability !== 100 ? `<span class="public-view_step-random" title="Random response">&nbsp;🔀&nbsp;</span>` : ''}
${reaction.steps.length > 1 ? `<br /><span class="public-view_step-more">and ${reaction.steps.length - 1} more steps</span>` : ''}
`;
}

export const publicView = inlineComponent(controls => {
  controls.setup("public-view", "public-view");

  let reactions: PranDroidReactionDefinitions;

  (async () => {
    reactions = (await retryFetch("/api/reactions").then(r => r.json())).data;
    reactions = reactions.filter(reaction => !reaction.isDisabled);
    controls.changed();
  })();

  return () => !reactions ? '<p>Loading...</p>' : `
<div class="public-view_container">
  <h1 class="public-view_title">Prandroid Reactions</h1>
  <table>
  <thead>
    <th>Trigger</th>
    <th>Response</th>
    <th>Count</th>
  </thead>
  <tbody>
  ${reactions.map(reaction => `
    <tr>
      <td>${printTriggers(reaction)}</td>
      <td>${printSteps(reaction)}</td>
      <td class="public-view_count-cell">${reaction.count}</td>
    </tr>
  `).join('')}
  </tbody>
  </table>
</div>
  `;
});

function getIdleAnimation(): AnimationRun {
  return StepAnimationRun.animating({
    nextStep() {
      const fps = 60;

      return {
        fps: fps,
        layers: [
          [
            drawId('happyIdle')
          ],
          [
            drawId('eyes_open'),
            wait(randomFramesBetweenInMs(5000, 10000, fps)),
            drawId('eyes_semi_open'),
            wait(3),
            drawId('eyes_closed'),
            wait(3),
            drawId('eyes_semi_open'),
            wait(3),
            drawId('eyes_open')
          ],
          [
            drawId('head_idle')
          ]
        ]
      }
    }
  });
}
