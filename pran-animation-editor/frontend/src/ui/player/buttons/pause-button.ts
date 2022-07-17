import { inlineComponent, onClick } from 'pran-gular-frontend';
import { PlayerController, PlayerState } from '../../../core/player/player-controller';

const myCmp = inlineComponent(controls => {
  return () => ['fdas', (e: HTMLElement) => { console.log(e) }];
});

export const createPauseButton = inlineComponent<{ playerController: PlayerController }>(controls => {
  let isPaused: boolean = false, unsubscribe: () => void;

  controls.setup('pause-button', 'pause-button');
  controls.onInputsChange = inputs => (
    isPaused = inputs.playerController.state === PlayerState.Pause,
      unsubscribe?.(),
      unsubscribe = inputs.playerController
        .onStateChange((newState: PlayerState) => (
          isPaused = newState === PlayerState.Pause,
            controls.changed()
        ))
  );

  return inputs =>
    controls.mandatoryInput('playerController') &&
    [`
      <button type="button" class="pause-button_button${isPaused ? ' is-active' : ''}">
          <img class="pause-button_button-icon" alt="pause" src="data:image/svg+xml;base64,PHN2ZyBoZWlnaHQ9JzMwMHB4JyB3aWR0aD0nMzAwcHgnICBmaWxsPSIjMDAwMDAwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB4bWw6c3BhY2U9InByZXNlcnZlIiB2ZXJzaW9uPSIxLjEiIHN0eWxlPSJzaGFwZS1yZW5kZXJpbmc6Z2VvbWV0cmljUHJlY2lzaW9uO3RleHQtcmVuZGVyaW5nOmdlb21ldHJpY1ByZWNpc2lvbjtpbWFnZS1yZW5kZXJpbmc6b3B0aW1pemVRdWFsaXR5OyIgdmlld0JveD0iMCAwIDg0NyA4NDciIHg9IjBweCIgeT0iMHB4IiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCI+PGRlZnM+PHN0eWxlIHR5cGU9InRleHQvY3NzIj4KICAgCiAgICAuZmlsMCB7ZmlsbDojMDAwMDAwfQogICAKICA8L3N0eWxlPjwvZGVmcz48Zz48cGF0aCBjbGFzcz0iZmlsMCIgZD0iTTYyIDc3N2wwIC03MDhjMCwtMzEgMjUsLTU2IDU2LC01NmwxOTEgMGMzMSwwIDU3LDI1IDU3LDU2bDAgNzA4YzAsMzIgLTI2LDU3IC01Nyw1N2wtMTkxIDBjLTMxLDAgLTU2LC0yNSAtNTYsLTU3em00MTkgMGwwIC03MDhjMCwtMzEgMjUsLTU2IDU2LC01NmwxOTEgMGMzMSwwIDU3LDI1IDU3LDU2bDAgNzA4YzAsMzIgLTI2LDU3IC01Nyw1N2wtMTkxIDBjLTMxLDAgLTU2LC0yNSAtNTYsLTU3eiI+PC9wYXRoPjwvZz48L3N2Zz4=" />
      </button>
    `, e => onClick(e, '.pause-button_button', () => inputs.playerController.pause())] as const;
});
