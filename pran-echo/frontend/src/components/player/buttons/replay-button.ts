import { inlineComponent } from '../../../framework/inline-component';
import { onClick } from '../../../framework/on-click';
import { PlayerController } from '../../../services/player-controller';

export const createReplayButton = inlineComponent<{ playerController: PlayerController }>(controls => {
  controls.setup('replay-button', 'replay-button');

  return inputs =>
    controls.mandatoryInput('playerController') &&
    [`
      <button type="button" class="replay-button_button">
          <img class="replay-button_button-icon" alt="replay" src="data:image/svg+xml;base64,PHN2ZyBoZWlnaHQ9JzMwMHB4JyB3aWR0aD0nMzAwcHgnICBmaWxsPSIjMDAwMDAwIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOmNjPSJodHRwOi8vY3JlYXRpdmVjb21tb25zLm9yZy9ucyMiIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyIgeG1sbnM6c3ZnPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczpzb2RpcG9kaT0iaHR0cDovL3NvZGlwb2RpLnNvdXJjZWZvcmdlLm5ldC9EVEQvc29kaXBvZGktMC5kdGQiIHhtbG5zOmlua3NjYXBlPSJodHRwOi8vd3d3Lmlua3NjYXBlLm9yZy9uYW1lc3BhY2VzL2lua3NjYXBlIiBzdHlsZT0iIiB4bWw6c3BhY2U9InByZXNlcnZlIiB2ZXJzaW9uPSIxLjEiIHZpZXdCb3g9IjAgMCA2NCA2NCIgeD0iMHB4IiB5PSIwcHgiIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2UtbWl0ZXJsaW1pdD0iMiI+PHBhdGggc3R5bGU9IiIgZD0iTSAzOS4xODYsMTkuOTg2IEMgMzcuMDg1LDE4LjcyNSAzNC42MjYsMTggMzIsMTggYyAtNy43MjcsMCAtMTQsNi4yNzMgLTE0LDE0IDAsNy43MjcgNi4yNzMsMTQgMTQsMTQgNi4wODUsMCAxMS4yNjgsLTMuODkgMTMuMTksLTkuMjk3IDAuNTUzLC0xLjYxMSAyLjA2OSwtMi42OTIgMy43NTQsLTIuNjkyIEMgNTAuMTIyLDM0IDUxLjc5OSwzNCA1My4xODUsMzQgYyAxLjI0NSwtMTBlLTQgMi40MiwwLjU3OSAzLjE3NywxLjU2NyAwLjc1NywwLjk4OSAxLjAxMSwyLjI3NCAwLjY4LDMuNSBDIDUzLjk0Niw0OS45ODYgNDMuOTAxLDU4IDMyLDU4IDE3LjY1LDU4IDYsNDYuMzUgNiwzMiA2LDE3LjY1IDE3LjY1LDYgMzIsNiBjIDUuOTQ1LDAgMTEuNDI3LDIgMTUuODA5LDUuMzYzIDAsMCAxLjUwNywtMS41MDggMy4zNjMsLTMuMzYzIDEuMTQ0LC0xLjE0NCAyLjg2NCwtMS40ODYgNC4zNTksLTAuODY3IDEuNDk0LDAuNjE5IDIuNDY5LDIuMDc4IDIuNDY5LDMuNjk1IDAsNi4xNiAwLDEzLjMyMyAwLDE1LjE3MiAwLDEuMDYxIC0wLjQyMSwyLjA3OCAtMS4xNzIsMi44MjggQyA1Ni4wNzgsMjkuNTc5IDU1LjA2MSwzMCA1NCwzMCBjIC0xLjg0OSwwIC05LjAxMiwwIC0xNS4xNzIsMCAtMS42MTcsMCAtMy4wNzYsLTAuOTc1IC0zLjY5NSwtMi40NjkgLTAuNjE5LC0xLjQ5NSAtMC4yNzcsLTMuMjE1IDAuODY3LC00LjM1OSAxLjc2OCwtMS43NjkgMy4xODYsLTMuMTg2IDMuMTg2LC0zLjE4NiB6IiBmaWxsPSIjMDAwMDAwIj48L3BhdGg+PC9zdmc+" />
      </button>
    `, e => onClick(e, '.replay-button_button', () => {
      inputs.playerController.stop();
      inputs.playerController.play();
    })];
});