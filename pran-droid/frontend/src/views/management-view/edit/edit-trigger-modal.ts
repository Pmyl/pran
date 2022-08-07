import { inlineComponent, ModalContentInputs, onChange, onClick } from 'pran-gular-frontend';
import { promptDeleteConfirmation } from '../../../helpers/confirmation-modal';
import { trigger } from '../../public-view/components/trigger';
import { ReactionTrigger } from '../../public-view/models';
import './edit-trigger-modal.css';

type EditTriggerAction = { type: 'deleted' } | { type: 'edited', editedTrigger: ReactionTrigger };

type Inputs = { trigger?: ReactionTrigger } & ModalContentInputs<{ action: EditTriggerAction }>;

export const editTriggerModal = inlineComponent<Inputs>(controls => {
  controls.setup('edit-trigger-modal', 'edit-trigger-modal');
  controls.setComplexRendering();

  let editModel: ReactionTrigger = {
    type: 'ChatCommand',
    command: ''
  };
  let originalTrigger: ReactionTrigger;
  let isNew: boolean = true;

  controls.onInputChange = {
    trigger: t => (originalTrigger = t, editModel = { ...t }, isNew = false),
    interceptDismiss: i => i(() => isFormDirty()
      ? promptDeleteConfirmation('All changes will be cancelled, are you sure you want to close the modal?').onClose.then(result => ({ preventDismiss: !result }))
      : Promise.resolve({ preventDismiss: false }))
  };

  function isFormDirty() {
    return JSON.stringify(originalTrigger) != JSON.stringify(editModel);
  }

  return (inputs, r) => {
    r.el('h2', 'edit-trigger-modal_title').text('Reaction > Trigger').endEl();
    r.el('div', 'edit-trigger-modal_view-container');
      if (!isNew) {
        r.cmp(trigger, { trigger: inputs.trigger });
        r.el('b').text(' > ').endEl();
      }
      r.cmp(trigger, { trigger: { ...editModel } });
    r.endEl();

    r.el('form', 'edit-trigger-modal_form-container');
      r.el('div', 'edit-trigger-modal_form-input-container');
        r.el('label').attr('for', 'edit-trigger-modal_trigger-type-input').text('Trigger type').endEl();
        r.el('select').attr('id', 'edit-trigger-modal_trigger-type-input');
          r.el('option').attr('value', 'ChatCommand').text('ChatCommand');
          editModel.type == 'ChatCommand' && r.attr('selected', 'selected');
          r.endEl();
          r.el('option').attr('value', 'ChatKeyword').text('ChatKeyword')
          editModel.type == 'ChatKeyword' && r.attr('selected', 'selected');
          r.endEl();
        r.endEl();
      r.endEl();
      r.el('div', 'edit-trigger-modal_form-input-container');
      if (editModel.type == 'ChatCommand') {
        r.el('label').attr('for', 'edit-trigger-modal_trigger-text-input').text('Trigger').endEl();
        r.el('input').attr('id', 'edit-trigger-modal_trigger-text-input').attr('value', editModel.command || '').endEl();
      } else {
        r.el('label').attr('for', 'edit-trigger-modal_trigger-text-input').text('Trigger').endEl();
        r.el('input').attr('id', 'edit-trigger-modal_trigger-text-input').attr('value', editModel.keyword || '').endEl();
      }
      r.endEl();

      r.el('div', 'edit-trigger-modal_buttons-container');
        if (!isNew) {
          r.el('button', 'button button-danger button-small edit-trigger-modal_delete-button').text('DELETE TRIGGER').attr('type', 'button').endEl();
        }
        r.el('button', 'button edit-trigger-modal_cancel-button').text('CANCEL').attr('type', 'button').endEl();
        r.el('button', 'button button-positive edit-trigger-modal_save-button').text('OK').attr('type', 'submit');
          if(editModel.type === 'ChatCommand' && (!editModel.command || editModel.command?.includes(' '))
            || editModel.type === 'ChatKeyword' && !editModel.keyword?.trim()) {
            r.attr('disabled', 'disabled');
          }
        r.endEl();
      r.endEl();
    r.endEl();

    return e => (
      onChange(e, '#edit-trigger-modal_trigger-type-input', e => (editModel.type = e.target.value as any, controls.changed())),
      onChange(e, '#edit-trigger-modal_trigger-text-input', e => (editModel.type === 'ChatCommand' ? editModel.command = e.target.value : editModel.keyword = e.target.value, controls.changed())),
      onClick(e, '.edit-trigger-modal_cancel-button', () => inputs.close()),
      onClick(e, '.edit-trigger-modal_save-button', () => inputs.close({ action: { type: 'edited', editedTrigger: editModel } })),
      onClick(e, '.edit-trigger-modal_delete-button', () => promptDeleteConfirmation('Are you sure you want to delete this trigger?').onConfirm(() => inputs.close({ action: { type: 'deleted' } })))
    );
  };
});

