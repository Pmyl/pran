import { Component, ParentElement } from '../../framework/component';
import { Player } from '../../services/player';

export class LoopToggle extends Component {
  private _player: Player;

  constructor(parent: ParentElement, player: Player) {
    super(parent, 'loop-toggle', 'loop-toggle');
    this._player = player;
  }

  protected _render(): string {
    return `
<input class="loop-toggle_input" type="checkbox" />
`;
  }
  
  protected _postRender(componentToRender: HTMLElement) {
    componentToRender.querySelector('.loop-toggle_input').addEventListener('click', (e) => {
      this._player.setLoop((e.target as HTMLInputElement).checked);
    });
  }
}