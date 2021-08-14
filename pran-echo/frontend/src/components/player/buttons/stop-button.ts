import { Component } from '../../../framework/component';
import { PlayerController } from '../../../services/player-controller';

export class StopButton extends Component {
  public playerController: PlayerController;

  constructor() {
    super('stop-button', 'stop-button');
  }

  protected _render(): string {
    if (!this.playerController) {
      throw new Error(`PlayerController input is mandatory in component ${this.constructor.name} before rendering`);
    }

    return `
<button type="button" class="stop-button_button">
    Stop
</button>
`;
  }
  
  protected override _postRender(component: HTMLElement): void {
    component.querySelector('.stop-button_button').addEventListener('click', () => {
      this.playerController.stop();
    });
  }
}