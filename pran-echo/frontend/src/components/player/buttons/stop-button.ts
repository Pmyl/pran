import { Component, ParentElement } from '../../../framework/component';
import { Player } from '../../../services/player';

export class StopButton extends Component {
  private player: Player;

  constructor(parent: ParentElement, player: Player) {
    super(parent, 'stop-button', 'stop-button');
    this.player = player;
  }

  protected _render(): string {
    return `
<button type="button" class="stop-button_button">
    Stop
</button>
`;
  }
  
  protected override _postRender(component: HTMLElement): void {
    component.querySelector('.stop-button_button').addEventListener('click', () => {
      this.player.stop();
    });
  }
}