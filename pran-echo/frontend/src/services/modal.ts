import { Container } from '../components/container/container';
import { createModal, ModalContentInputs } from '../components/modal-template/modal-template';
import { Component } from '../framework/component';

export class Modal {
  private static modalContainer: Container;

  public static init(modalContainer: Container) {
    if (Modal.modalContainer) throw new Error('Cannot initialize Modal multiple times');
    Modal.modalContainer = modalContainer;
  }

  public static open<TResult>(modalContent: Component<ModalContentInputs<TResult>>): Promise<TResult> {
    if (!Modal.modalContainer) throw new Error('Modal has to be initialized before opening');
    
    return new Promise(r => {
      const modal = createModal({
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