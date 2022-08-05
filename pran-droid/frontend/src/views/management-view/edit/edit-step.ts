import { inlineComponent, Modal, onClick } from 'pran-gular-frontend';
import { ReactionStep } from '../../public-view/models';
import { editStepModal } from './edit-step-modal';
import './edit-step.css';

export const editStep = inlineComponent<{ step: ReactionStep, onDelete: () => void, onEdit: (newStep: ReactionStep) => void }>(controls => {
  controls.setup('edit-step', 'edit-step');
  controls.setComplexRendering();

  return (inputs, r) => {
    r.el('div', 'button edit-step_container').attr('tabindex', '0');
      if (inputs.step.type === 'Moving') {
        r.el('span').text('Moving step (cannot edit right now, work in progress...)').endEl();
      } else {
        inputs.step.alternatives.forEach(alternative => {
          r.el('div', 'edit-step_alternative-container');
            r.el('span', 'edit-step_alternative-probability').text(`${alternative.probability.toString()}%`).endEl();
            r.el('span', 'edit-step_alternative-text').text(alternative.message.text).endEl();
          r.endEl();
        });
      }
    r.endEl();

    return e => (onClick(e, '.edit-step_container', () => showEditModal(inputs.step, inputs.onDelete, inputs.onEdit)));
  };
});

function showEditModal(step: ReactionStep, onDelete: () => void, onEdit: (newStep: ReactionStep) => void) {
  Modal.open(editStepModal({ step })).then(result => {
    switch (result.action.type) {
      case 'edited':
        onEdit(result.action.editedStep);
        break;
      case 'deleted':
        onDelete();
        break;
    }
  });
}