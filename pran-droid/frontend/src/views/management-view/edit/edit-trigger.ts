import { inlineComponent, Modal, onClick } from 'pran-gular-frontend';
import { trigger } from '../../public-view/components/trigger';
import { ReactionTrigger } from '../../public-view/models';
import { editTriggerModal } from './edit-trigger-modal';

export const editTrigger = inlineComponent<{ trigger: ReactionTrigger, onDelete: () => void, onEdit: (newTrigger: ReactionTrigger) => void }>(controls => {
  controls.setup('edit-trigger', 'edit-trigger');
  controls.setComplexRendering();

  return (inputs, r) => {
    r.el('span', 'button button-tight edit-trigger_wrapper');
      r.cmp(trigger, { trigger: inputs.trigger });
    r.endEl();

    return e => (onClick(e, '.edit-trigger_wrapper', () => showEditModal(inputs.trigger, inputs.onDelete, inputs.onEdit)));
  };
});

function showEditModal(trigger: ReactionTrigger, onDelete: () => void, onEdit: (newTrigger: ReactionTrigger) => void) {
  Modal.open(editTriggerModal({ trigger })).then(result => {
    switch (result?.action.type) {
      case 'edited':
        onEdit(result.action.editedTrigger);
        break;
      case 'deleted':
        onDelete();
        break;
    }
  });
}
