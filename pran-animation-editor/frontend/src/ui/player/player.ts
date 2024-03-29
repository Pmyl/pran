import './buttons/buttons.css';
import './player.css';
import { Component, Container, mandatoryInput } from 'pran-gular-frontend';
import { PlayerController } from '../../core/player/player-controller';
import { createPlaybackRateToggle } from './buttons/playback-rate-toggle';
import { createPauseButton } from './buttons/pause-button';
import { createPlayButton } from './buttons/play-button';
import { createReplayButton } from './buttons/replay-button';
import { createStopButton } from './buttons/stop-button';
import { createLoopToggle } from './buttons/loop-toggle';

export class Player extends Component<{ playerController: PlayerController, showControls?: boolean }> {
  public readonly canvas: Component;

  constructor() {
    super('player', 'player');
    this.canvas = Container.CreateEmptyElement('canvas');
    (this.canvas.componentElement as HTMLCanvasElement).width = 500;
    (this.canvas.componentElement as HTMLCanvasElement).height = 500;
  }

  protected _render = (): (string | Component)[] => {
    mandatoryInput(this, 'playerController');

    const elements = [this.canvas];

    if (this.inputs.showControls || this.inputs.showControls === undefined) {
      const playerControlsContainer = Container.CreateEmptyElement('section', 'player_controls-container');

      createReplayButton({ playerController: this._inputs.playerController }).appendTo(playerControlsContainer);
      createStopButton({ playerController: this._inputs.playerController }).appendTo(playerControlsContainer);
      createPauseButton({ playerController: this._inputs.playerController }).appendTo(playerControlsContainer);
      createPlayButton({ playerController: this._inputs.playerController }).appendTo(playerControlsContainer);
      createLoopToggle({ playerController: this._inputs.playerController }).appendTo(playerControlsContainer);
      createPlaybackRateToggle({ playerController: this._inputs.playerController }).appendTo(playerControlsContainer);

      elements.push(playerControlsContainer);
    }

    return elements;
  };
}