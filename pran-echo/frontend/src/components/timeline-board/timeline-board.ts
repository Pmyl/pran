import './timeline-board.css';
import { Animator } from 'pran-animation-frontend';
import { Component } from '../../framework/component';
import { inlineComponent } from '../../framework/inline-component';
import { onClick } from '../../framework/on-click';
import { staticElement } from '../../framework/static-element';
import { PlayerController } from '../../services/player-controller';
import { TimelineBar } from '../timeline-bar/timeline-bar';

const frameWidth: number = 20;

export const createTimelineBoard = inlineComponent<{ animator: Animator, playerController: PlayerController }>(controls => {
  let bars: Component[],
    currentFrame: number = 0;

  controls.setup('timeline-board', 'timeline-board');
  controls.onInputChange = inputs => (
    bars = createBars(inputs.animator),
    currentFrame = inputs.animator.currentFrame,
    inputs.animator.onFrameChange((frame: number) => (currentFrame = frame, controls.changed())),
    controls.changed());

  return inputs => {
    controls.mandatoryInput('animator');
    controls.mandatoryInput('playerController');

    return [[staticElement('<div class="timeline-board_right-padding"></div>'),
`
<span class="timeline-board_vertical-line" style="left: ${currentFrame * frameWidth}px"></span>
`,
      staticElement(`<div class="timeline-board_frame-pick-area" style="width: ${inputs.animator.totalFrames * frameWidth}px">${createFramesLines(inputs.animator.totalFrames)}</div>`),
      ...bars
    ], element => onClick(element, '.timeline-board_frame-pick-area', e => {
      const rect = e.target.getBoundingClientRect();
      const x = e.clientX - rect.left;
      inputs.playerController.pickFrame(Math.round(x / frameWidth));
    })];
  };
});

function createFramesLines(frames: number): string {
  let result: string = '';

  for (let i = 0; i < frames; i++) {
    result += `<div class="timeline-board_frame-pick-line" style="left: ${i * frameWidth}px"></div>`
  }
  
  return result;
}

function createBars(animator: Animator): Component[] {
  return animator.timelines.map(t => {
    const timelineBar = new TimelineBar(t, animator)
    timelineBar.frameWidth = frameWidth;
    timelineBar.render();
    return timelineBar; 
  });
}