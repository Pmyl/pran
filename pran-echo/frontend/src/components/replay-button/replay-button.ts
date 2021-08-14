import { Component, ParentElement } from '../../framework/component';
import { Player } from '../../services/player';

export class ReplayButton extends Component {
  private player: Player;

  constructor(parent: ParentElement, player: Player) {
    super(parent, 'replay-button', 'replay-button');
    this.player = player;
  }

  protected _render(): string {
    return `
<button type="button" class="replay-button_button">
    Replay
</button>
`;
  }
  
  protected override _postRender(component: HTMLElement): void {
    component.querySelector('.replay-button_button').addEventListener('click', () => {
      this.player.stop();
      this.player.play();
    });
  }
}