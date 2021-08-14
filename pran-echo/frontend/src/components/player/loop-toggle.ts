import { Component } from '../../framework/component';
import { PlayerController } from '../../services/player-controller';

export class LoopToggle extends Component {
  public playerController: PlayerController;

  constructor() {
    super('loop-toggle', 'loop-toggle');
  }

  protected _render(): string {
    if (!this.playerController) {
      throw new Error(`PlayerController input is mandatory in component ${this.constructor.name} before rendering`);
    }

    return `
<input class="loop-toggle_input" type="checkbox" />
`;
  }
  
  protected _postRender(componentToRender: HTMLElement) {
    componentToRender.querySelector('.loop-toggle_input').addEventListener('click', (e) => {
      this.playerController.setLoop((e.target as HTMLInputElement).checked);
    });
  }
}