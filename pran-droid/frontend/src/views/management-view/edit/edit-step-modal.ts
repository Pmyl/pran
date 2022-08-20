import { inlineComponent, ModalContentInputs, onChange, onClick } from 'pran-gular-frontend';
import { promptDeleteConfirmation } from '../../../helpers/confirmation-modal';
import { retryFetch } from '../../../helpers/retry-fetch';
import { fixStepProbabilities } from '../../public-view/helpers/fix-reaction-probabilities';
import { Emotion, ReactionStep, ReactionTalkingStep } from '../../public-view/models';
import './edit-step-modal.css';

type EditStepAction = { type: 'deleted' } | { type: 'edited', editedStep: ReactionStep };

type Inputs = { step?: ReactionStep } & ModalContentInputs<{ action: EditStepAction }>;

export const editStepModal = inlineComponent<Inputs>(controls => {
  controls.setup('edit-step-modal', 'edit-step-modal');
  controls.setComplexRendering();

  let editModel: ReactionStep = {
    alternatives: [],
    type: 'Talking',
    emotionId: '',
    skip: {
      type: 'AfterStep',
      extraMs: 3000
    }
  };
  let isNew: boolean = true;
  let emotions: Emotion[] = [];
  let originalStep: ReactionStep;

  controls.onInputChange = {
    step: s => {
      isNew = false;
      originalStep = s;

      if (s.type !== 'Talking') {
        throw new Error('How???');
      } else {
        editModel = { ...s, alternatives: s.alternatives.map(alternative => ({ ...alternative, message: { ...alternative.message } })), skip: { ...s.skip } };
      }
    },
    interceptDismiss: i => i(() => isFormDirty()
      ? promptDeleteConfirmation('All changes will be cancelled, are you sure you want to close the modal?').onClose.then(result => ({ preventDismiss: !result }))
      : Promise.resolve({ preventDismiss: false }))
  };

  controls.afterFirstRender = async () => {
    emotions = (await retryFetch(`/api/emotions`).then(r => r.json())).data;
    if (editModel.type !== 'Talking') {
      throw new Error('How???');
    } else {
      editModel.emotionId || (editModel.emotionId = emotions[0].id);
    }
    controls.changed();
  };

  function isProbabilityIncorrect() {
    if (editModel.type === 'Talking') {
      const probability = editModel.alternatives.reduce((acc, al) => acc + (al.probability || 0), 0);
      return probability > 100
        || probability < 100 && !editModel.alternatives.some(al => al.probability === null || al.probability === undefined);
    } else {
      return false;
    }
  }

  function isFormDirty() {
    return JSON.stringify(editModel) != JSON.stringify(originalStep);
  }

  return (inputs, r) => {
    if (editModel.type === 'Moving') {
      r.el('span').text('how are you here? Moving cannot be edited').endEl();
      return;
    }
    r.el('h2', 'edit-step-modal_title').text('Reaction > Step').endEl();
    r.el('div', 'edit-step-modal_errors-container');
      if (isProbabilityIncorrect()) {
        r.el('span', 'edit-step-modal_error').text('Probability has to sum to 100%').endEl();
      }
    r.endEl();
    r.el('form', 'edit-step-modal_form-container');
      r.el('div', 'edit-step-modal_form-input-container');
        r.el('label').attr('for', 'edit-step-modal_emotion-input').text('Emotion').endEl();
        r.el('select').attr('id', 'edit-step-modal_emotion-input');
          for (let i = 0; i < emotions.length; i++) {
            const emotion = emotions[i];
            r.el('option').attr('value', emotion.id).text(emotion.name);
              editModel.emotionId == emotion.id && r.attr('selected', 'selected');
            r.endEl();
          }
        r.endEl();
      r.endEl();
      r.el('div', 'edit-step-modal_alternatives-container');
        let index: number = 0;
        editModel.alternatives.forEach(alternative => {
          const currentIndex: number = index;
          r.el('div', 'edit-step-modal_alternative-container');
            r.el('div', 'edit-step-modal_form-input-container');
              r.el('label').attr('for', `edit-step-modal_step-alternative-text-input${currentIndex}`).text('Text').endEl();
              r.el('textarea', 'edit-step-modal_step-alternative-text-input')
                .attr('data-index', currentIndex.toString())
                .attr('id', `edit-step-modal_step-alternative-text-input${currentIndex}`)
                .text(alternative.message.text).endEl();
            r.endEl();
            r.el('div', 'edit-step-modal_form-input-container');
              r.el('label', 'edit-step-modal_inline-label').attr('for', `edit-step-modal_step-alternative-probability-input${currentIndex}`).text('Probability %').endEl();
              r.el('input', 'edit-step-modal_step-alternative-probability-input')
                .attr('data-index', currentIndex.toString())
                .attr('id', `edit-step-modal_step-alternative-probability-input${currentIndex}`)
                .attr('value', alternative.probability?.toString() || '').endEl();
              r.el('button', 'button button-icon button-danger edit-step-modal_remove-alternative-button')
                .attr('type', 'button')
                .attr('data-index', index.toString())
                .text('🗑').endEl();
            r.endEl();
          r.endEl();
          index++;
        });
      r.endEl();
      r.el('button', 'button button-positive-alt button-small edit-step-modal_add-alternative-button').text('+ Alternative').attr('type', 'button').endEl();
      r.el('div', 'edit-step-modal_buttons-container');
        if (!isNew) {
          r.el('button', 'button button-danger button-small edit-step-modal_delete-button').text('DELETE STEP').attr('type', 'button').endEl();
        }
        r.el('button', 'button edit-step-modal_cancel-button').text('CANCEL').attr('type', 'button').endEl();
        r.el('button', 'button button-positive edit-step-modal_save-button').text('OK').attr('type', 'submit');
          if (isProbabilityIncorrect()) {
            r.attr('disabled', 'disabled');
          }
        r.endEl();
      r.endEl();
    r.endEl();

    return e => (
      onChange(e, '.edit-step-modal_step-alternative-text-input', e => ((editModel as ReactionTalkingStep).alternatives[+e.target.getAttribute('data-index')].message.text = e.target.value, controls.changed())),
      onChange(e, '.edit-step-modal_step-alternative-probability-input', e => ((editModel as ReactionTalkingStep).alternatives[+e.target.getAttribute('data-index')].probability = e.target.value === '' ? null : +e.target.value, controls.changed())),
      onClick(e, '.edit-step-modal_add-alternative-button', () => ((editModel as ReactionTalkingStep).alternatives.push({ message: { mode: 'Instant', text: '' }, probability: null }), controls.changed())),
      onClick(e, '.edit-step-modal_remove-alternative-button', e => ((editModel as ReactionTalkingStep).alternatives.splice(+e.target.getAttribute('data-index'), 1), controls.changed())),
      onClick(e, '.edit-step-modal_cancel-button', () => inputs.dismiss()),
      onClick(e, '.edit-step-modal_save-button', () => inputs.close({ action: { type: 'edited', editedStep: fixStepProbabilities(editModel) } })),
      onClick(e, '.edit-step-modal_delete-button', () => promptDeleteConfirmation('Are you sure you want to delete this step?').onConfirm(() => inputs.close({ action: { type: 'deleted' } })))
    );
  };
});

