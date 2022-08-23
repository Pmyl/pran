import './confirmation-modal.css';
import { inlineComponent, Modal, ModalContentInputs, onClick } from 'pran-gular-frontend';

interface ConfirmationButton {
  type: 'Positive' | 'Danger' | 'Plain';
  text: string;
  isConfirmation?: boolean;
}

type ConfirmationResult = { onConfirm: (cb: () => void) => ConfirmationResult, onCancel: (cb: () => void) => ConfirmationResult, onClose: Promise<boolean> };

export const promptDefaultConfirmation = (text: string): ConfirmationResult => promptConfirmation(text, [{ type: 'Positive', text: 'CONFIRM', isConfirmation: true}, { type: 'Plain', text: 'CANCEL' }]);
export const promptDeleteConfirmation = (text: string): ConfirmationResult => promptConfirmation(text, [{ type: 'Danger', text: 'CONFIRM', isConfirmation: true}, { type: 'Plain', text: 'CANCEL' }]);

export const promptConfirmation = (text: string, buttons: ConfirmationButton[]): ConfirmationResult => {
  let configuredOnConfirm: (() => void) | undefined = undefined;
  let configuredOnCancel: (() => void) | undefined = undefined;
  let result: ConfirmationResult;
  const onConfirm: (cb: () => void) => ConfirmationResult = (cb: () => void) => {
    configuredOnConfirm = cb;
    return result;
  };
  const onCancel: (cb: () => void) => ConfirmationResult = (cb: () => void) => {
    configuredOnCancel = cb;
    return result;
  };
  let resolvePromise: (isConfirmed: boolean) => void;
  result = { onConfirm, onCancel, onClose: new Promise(r => resolvePromise = r) };
  Modal.open(promptConfirmationModal({ text, buttons })).then(result => {
    if (result) {
      configuredOnConfirm?.();
      resolvePromise(true);
    } else {
      configuredOnCancel?.();
      resolvePromise(false);
    }
  });

  return result;
}

type PromptConfirmationModalInputs = { text: string, buttons: ConfirmationButton[] } & ModalContentInputs<boolean>;

const promptConfirmationModal = inlineComponent<PromptConfirmationModalInputs>(controls => {
  controls.setup('prompt-confirmation-modal', 'prompt-confirmation-modal');
  controls.setComplexRendering();

  return (inputs, r) => {
    r.el('div', 'prompt-confirmation-modal_container');
      r.el('span', 'prompt-confirmation-modal_warning').text('⚠').endEl();
      r.el('p', 'prompt-confirmation-modal_text').text(inputs.text).endEl();
      r.el('div', 'prompt-confirmation-modal_buttons-container buttons-container');
        inputs.buttons.forEach(button => {
          r.el('button', `button ${buttonClass(button.type)} prompt-confirmation-modal_button`).text(button.text);
          if (button.isConfirmation) {
            r.attr('data-confirmation', 'true');
          }
          r.attr('type', 'button').endEl();
        });
      r.endEl();
    r.endEl();

    return e => onClick(e, '.prompt-confirmation-modal_button', e => inputs.close(e.target.getAttribute('data-confirmation') === 'true'))
  };
});

function buttonClass(type: "Positive" | "Danger" | "Plain"): string {
  switch (type) {
    case 'Positive':
      return 'button-positive';
    case 'Danger':
      return 'button-danger';
    case 'Plain':
      return '';
  }
}