import { Component, ParentElement } from '../../../framework/component';
import { Player } from '../../../services/player';

export class PauseButton extends Component {
  private player: Player;

  constructor(parent: ParentElement, player: Player) {
    super(parent, 'pause-button', 'pause-button');
    this.player = player;
  }

  protected _render(): string {
    return `
<button type="button" class="pause-button_button">
    Pause
</button>
`;
  }
  
  protected override _postRender(component: HTMLElement): void {
    component.querySelector('.pause-button_button').addEventListener('click', () => {
      this.player.pause();
    });
  }
}