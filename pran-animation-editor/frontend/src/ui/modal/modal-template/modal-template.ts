import './modal-template.css';
import { Component } from '../../framework/component';
import { Container } from '../../framework/container';
import { inlineComponent } from '../../framework/inline-component';
import { onClick } from '../../framework/on-click';
import { ModalContentInputs } from '../modal-content-inputs';

type ModalInputs<TResult, T extends ModalContentInputs<TResult> = ModalContentInputs<TResult>> = { component: Component<T>, close: (returnValue?: TResult) => void };

export const createModalTemplate = inlineComponent<ModalInputs<unknown>>(controls => {
  controls.setup('modal-template', 'modal-template')
  controls.onInputsChange = inputs => {
    inputs.component.setInput('close', inputs.close);
  };

  return inputs => [[
    Container.CreateEmptyElement('div', 'modal-template_backdrop'),
    Container.CreateEmptyElement('div', 'modal-template_container')
      .append(inputs.component)
  ], e => onClick(e, '.modal-template_backdrop', () => inputs.close())];
});
