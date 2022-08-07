import './modal-template.css';
import { onClick } from '../../events/on-click';
import { InterceptResult } from '../modal';
import { ModalContentInputs } from '../modal-content-inputs';
import { Component } from '../../components/component';
import { inlineComponentOld } from '../../components/inline-component';
import { Keys, onKeydown } from '../../events/on-keydown';
import { Container } from '../../components/container';

type ModalInputs<TResult, T extends ModalContentInputs<TResult> = ModalContentInputs<TResult>> = {
  component: Component<T>;
  close: (returnValue?: TResult) => void;
};

export const createModalTemplate = inlineComponentOld<ModalInputs<unknown>>(controls => {
  controls.setup('modal-template', 'modal-template')

  let removeEscBinding: (() => void) | null = null;
  let intercepted: (() => Promise<InterceptResult>) | null = null;

  controls.onInputsChange = inputs => {
    inputs.component.setInput('close', inputs.close);
    inputs.component.setInput('dismiss', () => tryDismissModal(inputs));
    inputs.component.setInput('interceptDismiss', (interceptPromise: () => Promise<InterceptResult>) => intercepted = interceptPromise);

    removeEscBinding?.();
    removeEscBinding = onKeydown(Keys.Escape, () => tryDismissModal(inputs));
  };

  controls.onDestroy = () => removeEscBinding?.();

  function tryDismissModal(inputs: ModalInputs<unknown>) {
    if (!!intercepted) {
      intercepted().then(result => {
        if (result.preventDismiss) return;
        inputs.close();
      });
    } else {
      inputs.close();
    }
  }

  return inputs => [[
    Container.CreateEmptyElement('div', 'modal-template_backdrop'),
    Container.CreateEmptyElement('div', 'modal-template_container')
      .append(inputs.component)
  ], (e: HTMLElement) => (
    onClick(e, '.modal-template_backdrop', () => tryDismissModal(inputs))
  )];
});
