import { inlineComponent } from 'pran-gular-frontend';
import { assertUnreachable } from '../../../helpers/assert-unreachable';
import { ReactionTrigger } from '../models';
import './trigger.css';

export const trigger = inlineComponent<{ trigger: ReactionTrigger }>(controls => {
  controls.setup("reactions-table-trigger", "reactions-table-trigger");

  return inputs => {
    controls.mandatoryInput("trigger");
    const trigger: ReactionTrigger = inputs.trigger;

    switch (trigger.type) {
      case 'ChatCommand':
        return `<span class="reactions-table-trigger_command" title="Command, use this at the beginning of your message to trigger the reaction">${trigger.command || ''}</span>`
      case 'ChatKeyword':
        return `<span class="reactions-table-trigger_keyword" title="Keyword, use this anywhere in your message to trigger the reaction">${trigger.keyword || ''}</span>`
      case 'Action':
        switch (trigger.name) {
          case 'reward_redeem':
            return `<span class="reactions-table-trigger_reward-redeem" title="Reward redeem, redeem the specified reward to trigger the reaction">${trigger.id || ''}</span>`
          default:
            return assertUnreachable(trigger.name);
        }
      default:
        assertUnreachable(trigger);
    }
  };
});


export const triggers = inlineComponent<{ triggers: Array<ReactionTrigger> }>(controls => {
  controls.setup("reactions-table-triggers", "reactions-table-triggers");
  controls.setComplexRendering();

  return (inputs, r) => {
    controls.mandatoryInput("triggers");
    r.cmp(trigger, { trigger: inputs.triggers[0] });
    if (inputs.triggers.length > 1) {
      r.el('span', 'reactions-table-triggers_tooltip')
        r.el('span').html(`&nbsp;and ${inputs.triggers.length - 1} more`).endEl();
        r.el('span', 'reactions-table-triggers_tooltip-content');
          inputs.triggers.forEach(t => r.cmp(trigger, { trigger: t }));
        r.endEl();
      r.endEl();
    }
  };
});
