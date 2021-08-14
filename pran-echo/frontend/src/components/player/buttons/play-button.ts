import { Component, ParentElement } from '../../../framework/component';
import { Player } from '../../../services/player';

export class PlayButton extends Component {
  private player: Player;

  constructor(parent: ParentElement, player: Player) {
    super(parent, 'play-button', 'play-button');
    this.player = player;
  }

  protected _render(): string {
    return `
<button type="button" class="play-button_button">
    Play
</button>
`;
  }
  
  protected override _postRender(component: HTMLElement): void {
    component.querySelector('.play-button_button').addEventListener('click', () => {
      this.player.play();
    });
  }
}