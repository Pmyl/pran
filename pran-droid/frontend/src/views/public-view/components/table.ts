import { inlineComponent, onClick } from 'pran-gular-frontend';
import { PranDroidReactionDefinitions } from '../models';
import { steps } from './steps';
import { triggers } from './trigger';

export const reactionsTable = inlineComponent<{ reactions: PranDroidReactionDefinitions, advanced?: { toggleDisable: (reactionId: string) => void } }>(controls => {
  controls.setup('reactions-table', 'reactions-table');
  controls.setComplexRendering();

  return (inputs, r) => {
    controls.mandatoryInput('reactions')
    r.el('div', 'public-view_container');
      r.el('h1', 'public-view_title').text('Prandroid Reactions').endEl();
      r.el('table');
        r.el('thead');
          r.el('tr');
            ['Trigger', 'Response', 'Count'].map(header =>
            r.el('th').text(header).endEl())
            inputs.advanced
            && r.el('th').text('Enabled').endEl()
              .el('th').endEl();
          r.endEl();
        r.endEl();
        r.el('tbody');
          inputs.reactions.map(reaction => {
          r.el('tr').attr('rct-id', reaction.id);
            reaction.isDisabled && r.attr('disabled', '');
            r.el('td').cmp(triggers, { triggers: reaction.triggers }).endEl();
            r.el('td').cmp(steps, { steps: reaction.steps }).endEl();
            r.el('td', 'public-view_count-cell').text(reaction.count.toString()).endEl();
            inputs.advanced && (r.el('td'),
              r.el('button', 'toggle-disabled').text(reaction.isDisabled ? '✅' : '❌').endEl(),
            r.endEl());
          r.endEl();
          });
        r.endEl();
      r.endEl();
    r.endEl();

    return element => onClick(element, '.toggle-disabled', evt => inputs.advanced.toggleDisable(evt.target.parentElement.parentElement.getAttribute('rct-id')));
  };
});
