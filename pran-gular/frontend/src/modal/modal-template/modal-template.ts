import './modal-template.css';
import { onClick } from '../../events/on-click';
import { ModalContentInputs } from '../modal-content-inputs';
import { Component } from '../../components/component';
import { inlineComponentOld } from '../../components/inline-component';
import { Keys, onKeydown } from '../../events/on-keydown';
import { Container } from '../../components/container';

type ModalInputs<TResult, T extends ModalContentInputs<TResult> = ModalContentInputs<TResult>> = { component: Component<T>, close: (returnValue?: TResult) => void };

export const createModalTemplate = inlineComponentOld<ModalInputs<unknown>>(controls => {
  controls.setup('modal-template', 'modal-template')

  let removeEscBinding: () => void = null;

  controls.onInputsChange = inputs => {
    inputs.component.setInput('close', inputs.close);

    removeEscBinding?.();
    removeEscBinding = onKeydown(Keys.Escape, () => inputs.close());
  };

  controls.onDestroy = () => removeEscBinding?.();

  return inputs => [[
    Container.CreateEmptyElement('div', 'modal-template_backdrop'),
    Container.CreateEmptyElement('div', 'modal-template_container')
      .append(inputs.component)
  ], (e: HTMLElement) => (
    onClick(e, '.modal-template_backdrop', () => inputs.close())
  )];
});
