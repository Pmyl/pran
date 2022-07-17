import './modal.css';
import { Component } from '../components/component';
import { Container } from '../components/container';
import { ModalContentInputs } from './modal-content-inputs';
import { createModalTemplate } from './modal-template/modal-template';

export class Modal {
  private static modalContainer: Container;

  public static init(mainContainer: Container) {
    if (Modal.modalContainer) throw new Error('Cannot initialize Modal multiple times');
    Modal.modalContainer = Container.CreateEmptyElement(mainContainer, 'section', 'modal-container');
  }

  public static open<TResult>(modalContent: Component<ModalContentInputs<TResult>>): Promise<TResult> {
    if (!Modal.modalContainer) throw new Error('Modal has to be initialized before opening');

    return new Promise(r => {
      const modal = createModalTemplate({
        component: modalContent,
        close: (resultValue: TResult) => {
          this.modalContainer.remove(modal);
          r(resultValue);
        }
      });

      this.modalContainer.append(modal);
    });
  }
}