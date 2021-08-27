import { inlineComponent } from '../../../framework/inline-component';
import { onClick } from '../../../framework/on-click';
import { PlayerController } from '../../../services/player-controller';

export const createPlaybackRateToggle = inlineComponent<{ playerController: PlayerController }>(controls => {
  let playbackRates: number[] = [1, 0.5, 0.25, 0.1],
    currentRate: number = 0;

  controls.setup('half-playback-rate-toggle', 'half-playback-rate-toggle');

  return inputs =>
    controls.mandatoryInput('playerController') &&
    [`
      <button type="button" class="half-playback-rate-toggle_button${currentRate !== 0 ? ' is-active' : ''}">
            ${playbackRates[currentRate]}
          <!--
          <img class="half-playback-rate-toggle_button-icon" alt="loop toggle" src="data:image/svg+xml;base64,PHN2ZyBoZWlnaHQ9JzMwMHB4JyB3aWR0aD0nMzAwcHgnICBmaWxsPSIjMDAwMDAwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2ZXJzaW9uPSIxLjEiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgMTAwIDEwMCIgZW5hYmxlLWJhY2tncm91bmQ9Im5ldyAwIDAgMTAwIDEwMCIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+PGc+PGc+PHBhdGggZmlsbD0iIzAwMDAwMCIgc3Ryb2tlPSIjMDAwMDAwIiBzdHJva2Utd2lkdGg9IjEwIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1taXRlcmxpbWl0PSIxMCIgZD0iTTIxLjg1NSwxOS4yMjciPjwvcGF0aD48L2c+PGc+PHBhdGggZmlsbD0iIzAwMDAwMCIgc3Ryb2tlPSIjMDAwMDAwIiBzdHJva2Utd2lkdGg9IjEwIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1taXRlcmxpbWl0PSIxMCIgZD0iTTc4LjE0NCw4MSI+PC9wYXRoPjwvZz48Zz48cGF0aCBmaWxsPSIjMDAwMDAwIiBkPSJNODMuNTM0LDc1Ljg1N0w3Mi45MjcsNjUuMjVjLTEuOTUxLTEuOTUzLTUuMTE5LTEuOTUzLTcuMDcsMGMtMS45NTMsMS45NTEtMS45NTMsNS4xMTcsMCw3LjA2OSAgICBsMi4wNzQsMi4wNzNIMjguOTIyYy0zLjczMywwLTMuOTIyLTQuMTY1LTMuOTIyLTVWMzYuNDRsLTEwLTEwdjQyLjk1M2MwLDguNjksNS44NTUsMTUsMTMuOTIyLDE1aDM5LjAwN2wtMi4wNzIsMi4wNzEgICAgYy0xLjk1MywxLjk1MS0xLjk1Myw1LjExNywwLDcuMDdDNjYuODMzLDk0LjUxMiw2OC4xMTIsOTUsNjkuMzkyLDk1czIuNTYxLTAuNDg4LDMuNTM1LTEuNDY1bDEwLjYwNy0xMC42MDcgICAgQzg1LjQ4Nyw4MC45NzYsODUuNDg3LDc3LjgxLDgzLjUzNCw3NS44NTd6Ij48L3BhdGg+PC9nPjxnPjxwYXRoIGZpbGw9IiMwMDAwMDAiIGQ9Ik04NC45OTksMzAuODMzYzAtOC42OTEtNS44NTUtMTUtMTMuOTIyLTE1SDMyLjA3MmwyLjA3LTIuMDcxYzEuOTUzLTEuOTUzLDEuOTUzLTUuMTE5LDAtNy4wNzEgICAgYy0xLjk1My0xLjk1Mi01LjExNy0xLjk1Mi03LjA3MSwwTDE2LjQ2NCwxNy4yOTljLTEuOTUzLDEuOTUzLTEuOTUzLDUuMTE5LDAsNy4wNzFsMTAuNjA4LDEwLjYwNyAgICBjMC45NzcsMC45NzYsMi4yNTYsMS40NjQsMy41MzYsMS40NjRjMS4yODEsMCwyLjU2LTAuNDg4LDMuNTM3LTEuNDY0YzEuOTUzLTEuOTUzLDEuOTUzLTUuMTE5LDAtNy4wNzFsLTIuMDc0LTIuMDczaDM5LjAwOCAgICBjMy43MzEsMCwzLjkyMiw0LjE2NSwzLjkyMiw1djMyLjk1M2wxMCwxMEw4NC45OTksMzAuODMzTDg0Ljk5OSwzMC44MzN6Ij48L3BhdGg+PC9nPjwvZz48L3N2Zz4=" />
          -->
      </button>`,
      e => onClick(e, '.half-playback-rate-toggle_button', () => (
        inputs.playerController.setPlaybackRate((
          currentRate === playbackRates.length - 1 ? currentRate = 0 : currentRate += 1,
          playbackRates[currentRate]
        )), controls.changed()
      ))];
});
