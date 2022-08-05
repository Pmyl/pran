import { inlineComponent, onChange, onClick } from 'pran-gular-frontend';
import { authorize } from '../../../helpers/is-authorized';
import { trigger } from '../../public-view/components/trigger';
import { PranDroidReactionDefinition, ReactionStep, ReactionTalkingStep, ReactionTrigger } from '../../public-view/models';
import './edit-reaction.css';
import { editStep } from './edit-step';
import { editTrigger } from './edit-trigger';

type PranDroidReactionDefinitionFormModel = Omit<PranDroidReactionDefinition, 'id'> & {
  id?: PranDroidReactionDefinition['id']
};

export const editReaction = inlineComponent<{ reaction: PranDroidReactionDefinition, onDone: () => void }>(controls => {
  authorize();
  controls.setup("edit-reaction", "edit-reaction");
  controls.setComplexRendering();

  let reaction: PranDroidReactionDefinitionFormModel = {
    count: 0,
    isDisabled: false,
    steps: [],
    triggers: []
  };

  let isSaving: boolean = false;

  controls.onInputChange = {
    reaction: r => reaction = { ...r, steps: r.steps.slice(), triggers: r.triggers.slice() }
  };

  function replaceTriggerInReaction(original: ReactionTrigger, edited: ReactionTrigger) {
    const indexToReplace: number = reaction.triggers.findIndex(trigger => areSameTrigger(trigger, original));
    reaction.triggers.splice(indexToReplace, 1, edited);
    controls.changed();
  }

  function removeTriggerInReaction(original: ReactionTrigger) {
    const indexToRemove: number = reaction.triggers.findIndex(trigger => areSameTrigger(trigger, original));
    reaction.triggers.splice(indexToRemove, 1);
    controls.changed();
  }

  function storeTriggerForUpdate(original: ReactionTrigger, edited: ReactionTrigger) {
    if (areSameTrigger(original, edited)) {
      return;
    }

    replaceTriggerInReaction(original, edited);
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
      r.el('h2', 'edit-reaction_title').text('Edit reaction').endEl();
      reaction.triggers.forEach(t =>
        r.el('span', 'edit-reaction_trigger-container')
          .cmp(editTrigger, { trigger: t, onEdit: e => storeTriggerForUpdate(t, e), onDelete: () => removeTriggerInReaction(t) })
        .endEl()
      );
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
    r.endEl();

    r.el('div', 'edit-reaction_buttons-container');
      r.el('button', 'button button-positive edit-reaction_save-button').text('SAVE');
        if (reaction.steps.length === 0) {
          r.attr('disabled', 'disabled');
        }
      r.endEl();
      r.el('button', 'button button-danger edit-reaction_delete-button').text('DELETE').endEl();
    r.endEl();

    return e => (
      onChange(e, '#edit-reaction_count-input', e => reaction.count = +e.target.value),
      onChange(e, '#edit-reaction_disabled-input', e => reaction.isDisabled = Boolean(e.target.checked)),
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
          inputs.onDone();
        } else {
          let newReaction = await (await fetch(`/api/reactions`, { method: 'POST', body: JSON.stringify(reaction.triggers[0]), headers: { 'Content-Type': 'application/json' } })).json();
          await fetch(`/api/reactions/${newReaction.id}`, { method: 'PATCH', body: JSON.stringify(reaction), headers: { 'Content-Type': 'application/json' } });
          for (let i = 0; i < reaction.steps.length; i++) {
            await fetch(`/api/reactions/${newReaction.id}/steps`, { method: 'PUT', body: JSON.stringify({ ...reaction.steps[i], index: i }), headers: { 'Content-Type': 'application/json' } });
          }
        }
      }),
      onClick(e, '.edit-reaction_delete-button', () => {
        if (isSaving) {
          return;
        }

        isSaving = true;
        inputs.onDone();
      })
    );
  };
});

const areSameTrigger = (original: ReactionTrigger, edited: ReactionTrigger) =>
  original.type === edited.type
  && (original.type === 'ChatCommand'
    ? original.command === (edited as any).command
    : (original as any).keyword === (edited as any).keyword);