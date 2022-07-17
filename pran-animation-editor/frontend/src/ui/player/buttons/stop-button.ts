import { inlineComponentOld, onClick } from 'pran-gular-frontend';
import { PlayerController } from '../../../core/player/player-controller';

export const createStopButton = inlineComponentOld<{ playerController: PlayerController }>(controls => {
  controls.setup('stop-button', 'stop-button');

  return inputs =>
    controls.mandatoryInput('playerController') &&
    [`
      <button type="button" class="stop-button_button">
          <img class="stop-button_button-icon" alt="stop" src="data:image/svg+xml;base64,PHN2ZyBoZWlnaHQ9JzMwMHB4JyB3aWR0aD0nMzAwcHgnICBmaWxsPSIjMDAwMDAwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2ZXJzaW9uPSIxLjEiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgMTAwIDEwMCIgZW5hYmxlLWJhY2tncm91bmQ9Im5ldyAwIDAgMTAwIDEwMCIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+PHBhdGggZD0iTTc2LjUsMTVoLTUzYy00LjY4NywwLTguNSwzLjgxMy04LjUsOC41djUzYzAsNC42ODcsMy44MTMsOC41LDguNSw4LjVoNTNjNC42ODcsMCw4LjUtMy44MTMsOC41LTguNXYtNTMgIEM4NSwxOC44MTMsODEuMTg3LDE1LDc2LjUsMTV6Ij48L3BhdGg+PC9zdmc+" />
      </button>
    `, e => onClick(e, '.stop-button_button', () => inputs.playerController.stop())];
});
