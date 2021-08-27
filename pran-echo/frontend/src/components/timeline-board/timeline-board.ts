import { Animator, Timeline, TimelineChange, TimelineChangeType } from 'pran-animation-frontend';
import { Component } from '../../framework/component';
import { inlineComponent } from '../../framework/inline-component';
import { onClick } from '../../framework/on-click';
import { staticElement } from '../../framework/static-element';
import { IEvent, Mediator } from '../../services/mediator';
import { PlayerController } from '../../services/player-controller';
import { TimelineBar } from '../../services/timeline-bar';
import { createTimelineBar } from '../timeline-bar/timeline-bar';
import './timeline-board.css';

export type TimelinePositionChanged = IEvent<'timelinePositionChanged', number>;

export const createTimelineBoard = inlineComponent<{ animator: Animator, playerController: PlayerController, frameWidth: number }, { totalFrames: number }>(controls => {
  let bars: ReturnType<typeof createTimelineBar>[],
    currentFrame: number = 0,
    pickArea: Component;

  controls.setup('timeline-board', 'timeline-board');
  controls.onInputChange = {
    animator: (animator, inputs) => (
      bars = createBars(animator, inputs.frameWidth),
      currentFrame = animator.currentFrame,
      animator.onFrameChange((frame: number) => (currentFrame = frame, controls.changed())),
      animator.onTotalFramesChange(() => controls.setSideInput('totalFrames', animator.totalFrames)),
      animator.onTimelineChange((t: Timeline, c: TimelineChange) => {
        switch (c.type) {
          case TimelineChangeType.Add:
            bars.splice(c.index, 0, createTimelineBar({ timeline: t, animator, frameWidth: inputs.frameWidth }));
            break;
          case TimelineChangeType.Remove:
            const removedBar = bars.splice(c.index, 1)[0];
            removedBar.destroy();
            break;
        }
        controls.setSideInput('totalFrames', animator.totalFrames)
      }),
      controls.changed()
    ),
    frameWidth: (width, inputs) => {
      pickArea = createPickArea(Math.max(inputs.animator.totalFrames, TimelineBar.minLength), inputs.frameWidth);
      controls.changed();
    }
  };
  controls.onSideInputChange = {
    totalFrames: (total, _, inputs) => {
      pickArea = createPickArea(Math.max(total, TimelineBar.minLength), inputs.frameWidth);
      controls.changed();
    }
  }

  return inputs => {
    controls.mandatoryInput('animator');
    controls.mandatoryInput('playerController');

    return [[
      `<span class="timeline-board_vertical-line" style="left: ${currentFrame * inputs.frameWidth}px"></span>`,
      pickArea,
      ...bars
    ], element => onClick(element, '.timeline-board_frame-pick-area', e => {
      const rect = e.target.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const frame: number = Math.round(x / inputs.frameWidth);

      inputs.playerController.pickFrame(frame);
      Mediator.raiseEvent<TimelinePositionChanged>('timelinePositionChanged', frame);
    })];
  };
});

function createPickArea(totalFrames: number, frameWidth: number) {
  return staticElement(`<div class="timeline-board_frame-pick-area" style="width: ${totalFrames * frameWidth}px">${createFramesLines(totalFrames, frameWidth)}</div>`);
}

function createFramesLines(frames: number, frameWidth: number): string {
  let result: string = '';

  for (let i = 0; i < frames; i++) {
    result += `<div class="timeline-board_frame-pick-line" style="left: ${i * frameWidth}px"></div>`
  }
  
  return result;
}

function createBars(animator: Animator, frameWidth: number): ReturnType<typeof createTimelineBar>[] {
  return animator.timelines.map(timeline =>
     createTimelineBar().setInputs({ timeline, animator, frameWidth })
  );
}