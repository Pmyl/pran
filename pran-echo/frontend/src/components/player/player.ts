import './buttons/buttons.css';
import { Component } from '../../framework/component';
import { mandatoryInput } from '../../framework/mandatory-input';
import { PlayerController } from '../../services/player-controller';
import { Container } from '../container/container';
import { createPauseButton } from './buttons/pause-button';
import { createPlayButton } from './buttons/play-button';
import { createReplayButton } from './buttons/replay-button';
import { createStopButton } from './buttons/stop-button';
import { createLoopToggle } from './buttons/loop-toggle';

export class Player extends Component<{ playerController: PlayerController }> {
  public readonly canvas: Component;

  constructor() {
    super('player', 'player');
    this.canvas = Container.CreateEmptyElement('canvas');
    (this.canvas.componentElement as HTMLCanvasElement).width = 500;
    (this.canvas.componentElement as HTMLCanvasElement).height = 500;
  }

  protected _render(): (string | Component)[] {
    mandatoryInput(this, 'playerController');

    const playerControlsContainer = Container.CreateEmptyElement('section', 'player-controls-container');

    const replayButton = createReplayButton({ playerController: this._inputs.playerController }).appendTo(playerControlsContainer);
    replayButton.render();

    const stopButton = createStopButton({ playerController: this._inputs.playerController }).appendTo(playerControlsContainer);
    stopButton.render();

    const pauseButton = createPauseButton({ playerController: this._inputs.playerController }).appendTo(playerControlsContainer);
    pauseButton.render();

    const playButton = createPlayButton({ playerController: this._inputs.playerController }).appendTo(playerControlsContainer);
    playButton.render();

    const loopToggle = createLoopToggle({ playerController: this._inputs.playerController }).appendTo(playerControlsContainer);
    loopToggle.render();

    return [this.canvas, playerControlsContainer];
  }
}