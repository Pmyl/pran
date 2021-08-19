import './modal-template.css';
import { Component } from '../../framework/component';
import { inlineComponent } from '../../framework/inline-component';
import { onClick } from '../../framework/on-click';
import { Container } from '../container/container';

export type ModalContentInputs<TResult> = { close?: (returnValue?: TResult) => void; };
type ModalInputs<TResult, T extends ModalContentInputs<TResult> = ModalContentInputs<TResult>> = { component: Component<T>, close: (returnValue?: TResult) => void };

export const createModal = inlineComponent<ModalInputs<unknown>>(controls => {
  controls.setup('modal', 'modal')
  controls.onInputsChange = inputs => {
    inputs.component.setInput('close', inputs.close);
  };

  return inputs => [[
    Container.CreateEmptyElement('div', 'modal_backdrop'),
    Container.CreateEmptyElement('div', 'modal_container')
      .append(inputs.component)
  ], e => onClick(e, '.modal_backdrop', () => inputs.close())];
});
