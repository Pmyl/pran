import { inlineComponent, onClick } from 'pran-gular-frontend';
import { PranDroidReactionDefinitions } from '../models';
import { steps } from './steps';
import { triggers } from './trigger';
import './table.css';

type ReactionsTableInputs = {
  reactions: PranDroidReactionDefinitions,
  advanced?: { toggleDisable: (reactionId: string) => void, edit: (reactionId: string) => void }
};

export const reactionsTable = inlineComponent<ReactionsTableInputs>(controls => {
  controls.setup('reactions-table', 'reactions-table');
  controls.setComplexRendering();

  return (inputs, r) => {
    controls.mandatoryInput('reactions')
    r.el('table');
      r.el('thead');
        r.el('tr');
          inputs.advanced
          && r.el('th').text('Options').endEl();
          ['Trigger', 'Response', 'Count'].map(header =>
          r.el('th').text(header).endEl())
        r.endEl();
      r.endEl();
      r.el('tbody');
        inputs.reactions.map(reaction => {
        r.el('tr').attr('rct-id', reaction.id);
          reaction.isDisabled && r.attr('disabled', '');
          inputs.advanced && (() => {
            r.el('td', 'reactions-table_options-cell');
              r.el('div', 'reactions-table_options-container');
                r.el('button', 'button button-icon toggle-disabled');
                  if (reaction.isDisabled) {
                    r.text('❌').attr('isDisabled', '');
                  } else {
                    r.text('✔');
                  }
                r.endEl();
                r.el('button', 'button button-icon edit-button').text('⚙').endEl();
              r.endEl();
            r.endEl();
          })();
          r.el('td').cmp(triggers, { triggers: reaction.triggers }).endEl();
          r.el('td').cmp(steps, { steps: reaction.steps }).endEl();
          r.el('td', 'reactions-table_count-cell').text(reaction.count.toString()).endEl();
        r.endEl();
        });
      r.endEl();
    r.endEl();

    return element => (
      onClick(element, '.toggle-disabled', evt => inputs.advanced.toggleDisable(evt.target.parentElement.parentElement.parentElement.getAttribute('rct-id'))),
      onClick(element, '.edit-button', evt => inputs.advanced.edit(evt.target.parentElement.parentElement.parentElement.getAttribute('rct-id')))
    );
  };
});
