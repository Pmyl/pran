import { inlineComponent, ModalContentInputs, onChange, onClick } from 'pran-gular-frontend';
import { trigger } from '../../public-view/components/trigger';
import { ReactionTrigger } from '../../public-view/models';
import './edit-trigger-modal.css';

type EditTriggerAction = { type: 'deleted' } | { type: 'edited', editedTrigger: ReactionTrigger };

type Inputs = { trigger: ReactionTrigger } & ModalContentInputs<{ action: EditTriggerAction }>;

export const editTriggerModal = inlineComponent<Inputs>(controls => {
  controls.setup('edit-trigger-modal', 'edit-trigger-modal');
  controls.setComplexRendering();

  let editModel: ReactionTrigger;

  controls.onInputChange = {
    trigger: t => editModel = { ...t }
  };

  return (inputs, r) => {
    r.el('div', 'edit-trigger-modal_view-container');
      r.cmp(trigger, { trigger: inputs.trigger });
      r.el('span').text(' -> ').endEl();
      r.cmp(trigger, { trigger: { ...editModel } });
    r.endEl();

    r.el('div', 'edit-trigger-modal_form-container');
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
    r.endEl();

    r.el('div', 'edit-trigger-modal_buttons-container');
      r.el('button', 'button button-positive edit-trigger-modal_save-button').text('SAVE');
        if(editModel.type === 'ChatCommand' && (!editModel.command || editModel.command?.includes(' '))
        || editModel.type === 'ChatKeyword' && (!editModel.keyword || editModel.keyword?.includes(' '))) {
          r.attr('disabled', 'disabled');
        }
      r.endEl();
      r.el('button', 'button button-danger edit-trigger-modal_delete-button').text('DELETE').endEl();
    r.endEl();

    return e => (
      onChange(e, '#edit-trigger-modal_trigger-type-input', e => (editModel.type = e.target.value as any, controls.changed())),
      onChange(e, '#edit-trigger-modal_trigger-text-input', e => (editModel.type === 'ChatCommand' ? editModel.command = e.target.value : editModel.keyword = e.target.value, controls.changed())),
      onClick(e, '.edit-trigger-modal_save-button', () => inputs.close({ action: { type: 'edited', editedTrigger: editModel } })),
      onClick(e, '.edit-trigger-modal_delete-button', () => inputs.close({ action: { type: 'deleted' } }))
    );
  };
});

