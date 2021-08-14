import { Component } from '../../framework/component';
import { PlayerController } from '../../services/player-controller';
import { Container } from '../container/container';
import { PauseButton } from './buttons/pause-button';
import { PlayButton } from './buttons/play-button';
import { ReplayButton } from './buttons/replay-button';
import { StopButton } from './buttons/stop-button';
import { LoopToggle } from './loop-toggle';

export class Player extends Component {
  public playerController: PlayerController;

  constructor() {
    super('player', 'player');
  }

  protected _render(): (string | Component)[] {
    if (!this.playerController) {
      throw new Error(`PlayerController input is mandatory in component ${this.constructor.name} before rendering`);
    }

    const playerControlsContainer = Container.CreateEmptyElement('section', 'player-controls-container');

    const replayButton = new ReplayButton().appendTo(playerControlsContainer);
    replayButton.playerController = this.playerController;
    replayButton.render();

    const stopButton = new StopButton().appendTo(playerControlsContainer);
    stopButton.playerController = this.playerController;
    stopButton.render();

    const pauseButton = new PauseButton().appendTo(playerControlsContainer);
    pauseButton.playerController = this.playerController;
    pauseButton.render();

    const playButton = new PlayButton().appendTo(playerControlsContainer);
    playButton.playerController = this.playerController;
    playButton.render();

    const loopToggle = new LoopToggle().appendTo(playerControlsContainer);
    loopToggle.playerController = this.playerController;
    loopToggle.render();

    return [playerControlsContainer];
  }
}