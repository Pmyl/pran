import './modal-template.css';
import { BaseRendering, Component, Container, inlineComponent, Keys, onClick, onKeydown } from 'pran-gular-frontend';
import { ModalContentInputs } from '../modal-content-inputs';

type ModalInputs<TResult, T extends ModalContentInputs<TResult> = ModalContentInputs<TResult>> = { component: Component<T>, close: (returnValue?: TResult) => void };

export const createModalTemplate = inlineComponent<ModalInputs<unknown>>(controls => {
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
  )] as ReturnType<BaseRendering<ModalInputs<unknown>>>;
});
