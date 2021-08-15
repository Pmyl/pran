import { inlineComponent } from '../../../framework/inline-component';
import { onClick } from '../../../framework/on-click';
import { PlayerController, PlayerState } from '../../../services/player-controller';

export const createPlayButton = inlineComponent<{ playerController: PlayerController }>(controls => {
  let isPlaying: boolean = false, unsubscribe: () => void;

  controls.setup('play-button', 'play-button');
  controls.onInputChange = inputs => (
    isPlaying = inputs.playerController.state === PlayerState.Play,
    unsubscribe?.(),
    unsubscribe = inputs.playerController
      .onStateChange((newState: PlayerState) => (
        isPlaying = newState === PlayerState.Play,
        controls.changed()
      ))
  );
  
  return inputs => controls.mandatoryInput('playerController') && [`
      <button type="button" class="play-button_button${isPlaying ? ' is-active' : ''}">
          <img class="play-button_button-icon" alt="play" src="data:image/svg+xml;base64,PHN2ZyBoZWlnaHQ9JzMwMHB4JyB3aWR0aD0nMzAwcHgnICBmaWxsPSIjMDAwMDAwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2ZXJzaW9uPSIxLjEiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgMTAwIDEwMCIgZW5hYmxlLWJhY2tncm91bmQ9Im5ldyAwIDAgMTAwIDEwMCIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+PHBhdGggZD0iTTEyLjUsODEuMVYxNi40YzAtNyw3LjQtMTEuNSwxMy42LTguM2w2Mi43LDMyLjNjNi43LDMuNSw2LjcsMTMuMSwwLDE2LjVMMjYuMSw4OS4zQzE5LjksOTIuNSwxMi41LDg4LDEyLjUsODEuMXoiPjwvcGF0aD48L3N2Zz4=" />
      </button>
    `, e => onClick(e, '.play-button_button', () => inputs.playerController.play())];
});
