import { inlineComponent, ModalContentInputs, onChange, onClick } from 'pran-gular-frontend';
import { ReactionStep, ReactionTalkingStep } from '../../public-view/models';
import './edit-step-modal.css';

type EditStepAction = { type: 'deleted' } | { type: 'edited', editedStep: ReactionStep };

type Inputs = { step: ReactionStep } & ModalContentInputs<{ action: EditStepAction }>;

export const editStepModal = inlineComponent<Inputs>(controls => {
  controls.setup('edit-step-modal', 'edit-step-modal');
  controls.setComplexRendering();

  let editModel: ReactionStep;

  controls.onInputChange = {
    step: s => editModel = { ...s }
  };

  return (inputs, r) => {
    if (inputs.step.type === 'Moving') {
      r.el('span').text('how are you here? Moving cannot be edited').endEl();
      return;
    }

    let index: number = 0;
    inputs.step.alternatives.forEach(alternative => {
      const currentIndex: number = index;
      r.el('div', 'edit-step-modal_form-input-container');
        r.el('label').attr('for', `edit-step-modal_step-alternative-text-input${currentIndex}`).text('Text').endEl();
        r.el('input', 'edit-step-modal_step-alternative-text-input')
          .attr('data-index', currentIndex.toString())
          .attr('id', `edit-step-modal_step-alternative-text-input${currentIndex}`)
          .attr('value', alternative.message.text).endEl();
        r.el('label').attr('for', `edit-step-modal_step-alternative-probability-input${currentIndex}`).text('Probability in %').endEl();
        r.el('input', 'edit-step-modal_step-alternative-probability-input')
          .attr('data-index', currentIndex.toString())
          .attr('id', `edit-step-modal_step-alternative-probability-input${currentIndex}`)
          .attr('value', alternative.probability.toString()).endEl();
      r.endEl();
      index++;
    });
    r.el('div', 'edit-step-modal_buttons-container');
      r.el('button', 'button button-positive edit-step-modal_save-button').text('SAVE');
        if (editModel.type === 'Talking' && editModel.alternatives.reduce((acc, al) => acc + al.probability, 0) !== 100) {
          r.attr('disabled', 'disabled');
        }
      r.endEl();
      r.el('button', 'button button-danger edit-step-modal_delete-button').text('DELETE').endEl();
    r.endEl();

    return e => (
      onChange(e, '.edit-step-modal_step-alternative-text-input', e => ((editModel as ReactionTalkingStep).alternatives[+e.target.getAttribute('data-index')].message.text = e.target.value, controls.changed())),
      onChange(e, '.edit-step-modal_step-alternative-probability-input', e => ((editModel as ReactionTalkingStep).alternatives[+e.target.getAttribute('data-index')].probability = +e.target.value, controls.changed())),
      onClick(e, '.edit-step-modal_save-button', () => inputs.close({ action: { type: 'edited', editedStep: editModel } })),
      onClick(e, '.edit-step-modal_delete-button', () => inputs.close({ action: { type: 'deleted' } }))
    );
  };
});

