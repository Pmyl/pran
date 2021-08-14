import { Component } from '../../../framework/component';
import { PlayerController } from '../../../services/player-controller';

export class PlayButton extends Component {
  public playerController: PlayerController;

  constructor() {
    super('play-button', 'play-button');
  }

  protected _render(): string {
    if (!this.playerController) {
      throw new Error(`PlayerController input is mandatory in component ${this.constructor.name} before rendering`);
    }

    return `
<button type="button" class="play-button_button">
    Play
</button>
`;
  }
  
  protected override _postRender(component: HTMLElement): void {
    component.querySelector('.play-button_button').addEventListener('click', () => {
      this.playerController.play();
    });
  }
}