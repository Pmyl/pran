import './timeline-board.css';
import { Animator } from 'pran-animation-frontend';
import { Component } from '../../framework/component';
import { inlineComponent } from '../../framework/inline-component';
import { onClick } from '../../framework/on-click';
import { PlayerController } from '../../services/player-controller';
import { TimelineBar } from '../timeline-bar/timeline-bar';

export const createTimelineBoard = inlineComponent<{ animator: Animator, playerController: PlayerController }>(controls => {
  let bars: Component[],
    currentFrame: number = 0;

  controls.setup('timeline-board', 'timeline-board');
  controls.onInputChange = inputs => (
    bars = createBars(inputs.animator),
    currentFrame = inputs.animator.currentFrame,
    inputs.animator.onFrameChange((frame: number) => (currentFrame = frame, controls.changed())),
    controls.changed());

  return inputs => controls.mandatoryInput('animator') &&
    controls.mandatoryInput('playerController') && [[`
<span class="timeline-board_vertical-line" style="left: ${currentFrame * 15}px"></span>
`,
`
<div class="timeline-board_frame-pick-area"></div>
`,
    ...bars
  ], element => onClick(element, '.timeline-board_frame-pick-area', e => {
      const rect = e.target.getBoundingClientRect();
      const x = e.clientX - rect.left;
      inputs.playerController.pickFrame(Math.floor(x / 15));
    })];
});

function createBars(animator: Animator): Component[] {
  return animator.timelines.map(t => {
    const timelineBar = new TimelineBar(t, animator)
    timelineBar.frameWidth = 15;
    timelineBar.render();
    return timelineBar; 
  });
}