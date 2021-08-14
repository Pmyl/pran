import { Component } from '../../../framework/component';
import { PlayerController } from '../../../services/player-controller';

export class ReplayButton extends Component {
  public playerController: PlayerController;

  constructor() {
    super('replay-button', 'replay-button');
  }

  protected _render(): string {
    if (!this.playerController) {
      throw new Error(`PlayerController input is mandatory in component ${this.constructor.name} before rendering`);
    }

    return `
<button type="button" class="replay-button_button">
    Replay
</button>
`;
  }
  
  protected override _postRender(component: HTMLElement): void {
    component.querySelector('.replay-button_button').addEventListener('click', () => {
      this.playerController.stop();
      this.playerController.play();
    });
  }
}