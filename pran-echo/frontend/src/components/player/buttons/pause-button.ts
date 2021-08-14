import { Component } from '../../../framework/component';
import { PlayerController } from '../../../services/player-controller';

export class PauseButton extends Component {
  public playerController: PlayerController;

  constructor() {
    super('pause-button', 'pause-button');
  }

  protected _render(): string {
    if (!this.playerController) {
      throw new Error(`PlayerController input is mandatory in component ${this.constructor.name} before rendering`);
    }

    return `
<button type="button" class="pause-button_button">
    Pause
</button>
`;
  }
  
  protected override _postRender(component: HTMLElement): void {
    component.querySelector('.pause-button_button').addEventListener('click', () => {
      this.playerController.pause();
    });
  }
}