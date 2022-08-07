import './modal.css';
import { Component } from '../components/component';
import { Container } from '../components/container';
import { ModalContentInputs } from './modal-content-inputs';
import { createModalTemplate } from './modal-template/modal-template';

export type InterceptResult = { preventDismiss: boolean };

export class Modal {
  private static modalContainer: Container;
  private static mainContainer: Container;
  private static originalOverflow: string;
  private static openedModalsCount: number = 0;

  public static init(mainContainer: Container) {
    if (Modal.modalContainer) throw new Error('Cannot initialize Modal multiple times');
    Modal.modalContainer = Container.CreateEmptyElement(mainContainer, 'section', 'modal-container');
    this.mainContainer = mainContainer;
  }

  public static open<TResult>(modalContent: Component<ModalContentInputs<TResult>>): Promise<TResult> {
    if (!Modal.modalContainer) throw new Error('Modal has to be initialized before opening');

    return new Promise(r => {
      const modal = createModalTemplate({
        component: modalContent,
        close: (resultValue: TResult) => {
          this.openedModalsCount--;
          this.modalContainer.remove(modal);
          if (this.openedModalsCount === 0) {
            this.mainContainer.componentElement.style.setProperty('overflow', this.originalOverflow);
          }
          r(resultValue);
        }
      });

      if (this.openedModalsCount === 0) {
        this.originalOverflow = this.mainContainer.componentElement.style.getPropertyValue('overflow');
        this.mainContainer.componentElement.style.setProperty('overflow', 'hidden');
      }
      this.openedModalsCount++;
      this.modalContainer.append(modal);
    });
  }
}