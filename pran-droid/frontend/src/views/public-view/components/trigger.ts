import { inlineComponent } from 'pran-gular-frontend';
import { ReactionTrigger } from '../models';
import './trigger.css';

export const trigger = inlineComponent<{ trigger: ReactionTrigger }>(controls => {
  controls.setup("reactions-table-trigger", "reactions-table-trigger");

  return inputs => controls.mandatoryInput("trigger") && inputs.trigger.type === 'ChatCommand' ?
    `<span class="reactions-table-trigger_command" title="Command, use this at the beginning of your message to trigger the reaction">${inputs.trigger.command || ''}</span>` :
    `<span class="reactions-table-trigger_keyword" title="Keyword, use this anywhere in your message to trigger the reaction">${inputs.trigger.keyword || ''}</span>`;
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
