import { inlineComponent, InterceptResult, Modal, onChange, onClick } from 'pran-gular-frontend';
import { promptDeleteConfirmation } from '../../../helpers/confirmation-modal';
import { authorize } from '../../../helpers/is-authorized';
import { PranDroidReactionDefinition, ReactionStep, ReactionTrigger } from '../../public-view/models';
import './edit-reaction.css';
import { editStep } from './edit-step';
import { editStepModal } from './edit-step-modal';
import { editTrigger } from './edit-trigger';
import { editTriggerModal } from './edit-trigger-modal';

type PranDroidReactionDefinitionFormModel = Omit<PranDroidReactionDefinition, 'id'> & {
  id?: PranDroidReactionDefinition['id']
};

export const editReaction = inlineComponent<{ reaction?: PranDroidReactionDefinition, onDone: () => void, onCancel: () => void, interceptDismiss: (interceptPromise: () => Promise<InterceptResult>) => void }>(controls => {
  authorize();
  controls.setup("edit-reaction", "edit-reaction");
  controls.setComplexRendering();

  let reaction: PranDroidReactionDefinitionFormModel = {
    count: 0,
    isDisabled: false,
    steps: [],
    triggers: []
  };
  let originalReaction: PranDroidReactionDefinition;
  let isSaving: boolean = false;

  controls.onInputChange = {
    reaction: r => r && (originalReaction = r, reaction = { ...r, steps: r.steps.map(step => ({ ...step })), triggers: r.triggers.map(trigger => ({ ...trigger })) }),
    interceptDismiss: i => i(() => isFormDirty()
      ? promptDeleteConfirmation('All changes will be cancelled, are you sure you want to close the modal?').onClose.then(result => ({ preventDismiss: !result }))
      : Promise.resolve({ preventDismiss: false }))
  };

  function isFormDirty() {
    return JSON.stringify(reaction) != JSON.stringify(originalReaction);
  }

  function removeTriggerInReaction(original: ReactionTrigger) {
    const indexToRemove: number = reaction.triggers.findIndex(trigger => areSameTrigger(trigger, original));
    reaction.triggers.splice(indexToRemove, 1);
    controls.changed();
  }

  function replaceTriggerForUpdate(original: ReactionTrigger, edited: ReactionTrigger) {
    if (areSameTrigger(original, edited)) {
      return;
    }

    const indexToReplace: number = reaction.triggers.findIndex(trigger => areSameTrigger(trigger, original));
    reaction.triggers.splice(indexToReplace, 1, edited);
    orderTriggers();
    controls.changed();
  }

  function addTriggerForUpdate(newTrigger: ReactionTrigger) {
    reaction.triggers.push(newTrigger);
    orderTriggers();
    controls.changed();
  }

  function orderTriggers() {
    reaction.triggers.sort((a, b) => a.type.localeCompare(b.type));
  }

  function storeStepForUpdate(original: ReactionStep, index: number) {
    reaction.steps.splice(index, 1, original);
    controls.changed();
  }

  function removeStepInReaction(index: number) {
    reaction.steps.splice(index, 1);
    controls.changed();
  }

  return (inputs, r) => {
    r.el('div', 'edit-reaction_container');
      r.el('h2', 'edit-reaction_title').text('Reaction').endEl();
      reaction.triggers.forEach(t =>
        r.el('span', 'edit-reaction_trigger-container')
          .cmp(editTrigger, { trigger: t, onEdit: e => replaceTriggerForUpdate(t, e), onDelete: () => removeTriggerInReaction(t) })
        .endEl()
      );
      r.el('button', 'button button-positive-alt button-small edit-reaction_add-trigger-button').text('+ Trigger').endEl();
      r.el('div', 'edit-reaction_form-input-container');
        r.el('label').attr('for', 'edit-reaction_count-input').text('Count').endEl();
        r.el('input').attr('id', 'edit-reaction_count-input').attr('type', 'number').attr('value', reaction.count.toString()).endEl();
      r.endEl();
      r.el('div', 'edit-reaction_form-input-container');
        r.el('label').attr('for', 'edit-reaction_disabled-input').text('Disabled').endEl();
        r.el('input').attr('id', 'edit-reaction_disabled-input').attr('type', 'checkbox').attr('checked', reaction.isDisabled ? 'checked' : null).endEl();
      r.endEl();

      let index: number = 0;
      reaction.steps.forEach(step => {
        const currentIndex = index;
        r.cmp(editStep, { step, onEdit: s => storeStepForUpdate(s, currentIndex), onDelete: () => removeStepInReaction(currentIndex) });
        index++;
      });
      r.el('button', 'button button-positive-alt button-small edit-reaction_form-add-step').text('+ Step').endEl();
    r.endEl();

    r.el('div', 'edit-reaction_buttons-container');
      // r.el('button', 'button button-danger edit-reaction_delete-button').text('DELETE REACTION').endEl();
      r.el('button', 'button edit-reaction_cancel-button').text('CANCEL').attr('type', 'button').endEl();
      r.el('button', 'button button-positive edit-reaction_save-button').text('SAVE');
        if (reaction.triggers.length === 0) {
          r.attr('disabled', 'disabled');
        }
      r.endEl();
    r.endEl();

    return e => (
      onChange(e, '#edit-reaction_count-input', e => reaction.count = +e.target.value),
      onChange(e, '#edit-reaction_disabled-input', e => reaction.isDisabled = Boolean(e.target.checked)),
      onClick(e, '.edit-reaction_add-trigger-button', _ => {
        Modal.open(editTriggerModal()).then(result => {
          switch (result?.action.type) {
            case 'edited':
              addTriggerForUpdate(result.action.editedTrigger);
              break;
          }
        });
      }),
      onClick(e, '.edit-reaction_form-add-step', _ => {
        Modal.open(editStepModal()).then(result => {
          switch (result?.action.type) {
            case 'edited':
              storeStepForUpdate(result.action.editedStep, reaction.steps.length);
              break;
          }
        });
      }),
      onClick(e, '.edit-reaction_cancel-button', async () => {
        if (isSaving) {
          return;
        }

        inputs.onCancel();
      }),
      onClick(e, '.edit-reaction_save-button', async () => {
        if (isSaving) {
          return;
        }

        isSaving = true;
        if (!!reaction.id) {
          await fetch(`/api/reactions/${reaction.id}`, { method: 'PATCH', body: JSON.stringify(reaction), headers: { 'Content-Type': 'application/json' } });
          for (let i = 0; i < reaction.steps.length; i++) {
            await fetch(`/api/reactions/${reaction.id}/steps`, { method: 'PUT', body: JSON.stringify({ ...reaction.steps[i], index: i }), headers: { 'Content-Type': 'application/json' } });
          }
          if (inputs.reaction.steps.length > reaction.steps.length) {
            for (let i = reaction.steps.length; i < inputs.reaction.steps.length; i++) {
              await fetch(`/api/reactions/${reaction.id}/steps`, { method: 'DELETE', body: JSON.stringify({ index: i }), headers: { 'Content-Type': 'application/json' } });
            }
          }
        } else {
          let newReaction = await (await fetch(`/api/reactions`, { method: 'POST', body: JSON.stringify({ trigger: reaction.triggers[0] }), headers: { 'Content-Type': 'application/json' } })).json();
          await fetch(`/api/reactions/${newReaction.id}`, { method: 'PATCH', body: JSON.stringify(reaction), headers: { 'Content-Type': 'application/json' } });
          for (let i = 0; i < reaction.steps.length; i++) {
            await fetch(`/api/reactions/${newReaction.id}/steps`, { method: 'PUT', body: JSON.stringify({ ...reaction.steps[i], index: i }), headers: { 'Content-Type': 'application/json' } });
          }
        }
        inputs.onDone();
      }),
      onClick(e, '.edit-reaction_delete-button', () => {
        if (isSaving) {
          return;
        }

        isSaving = true;
        // TODO: Add functionality to remove reaction
        promptDeleteConfirmation('Are you sure you want to delete this reaction?')
          .onConfirm(() => inputs.onDone())
          .onCancel(() => isSaving = false);
      })
    );
  };
});

const areSameTrigger = (original: ReactionTrigger, edited: ReactionTrigger) =>
  original.type === edited.type
  && (original.type === 'ChatCommand'
    ? original.command === (edited as any).command
    : (original as any).keyword === (edited as any).keyword);