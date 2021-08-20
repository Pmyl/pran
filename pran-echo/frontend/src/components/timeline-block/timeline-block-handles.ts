import './timeline-block-handles.css';
import { Animator, Timeline } from 'pran-animation-frontend';
import { EditorAction, EditorDoActionEvent } from '../../editor-queue/editor-queue';
import { inlineComponent } from '../../framework/inline-component';
import { onClick } from '../../framework/on-click';
import { onDrag } from '../../framework/on-drag';
import { Mediator } from '../../services/mediator';
import { expandBlock, expandBlockLeft, reduceBlock, reduceBlockLeft } from '../block-editor/editor-actions';
import { TimelineBar } from '../timeline-bar/timeline-bar';
import { Block } from './timeline-block';

type HandlesInputs = { isSelected: boolean, frameWidth: number, animator: Animator, timeline: Timeline, block: Block, timelineBar: TimelineBar };

export const createTimelineBlockHandles = inlineComponent<HandlesInputs>(controls => {
  controls.setup('timeline-block-handles', 'timeline-block-handles');
  let moveAmount: number = 0;

  controls.onInputChange = {
    isSelected: controls.changed
  };

  return inputs => [controls.mandatoryInput('frameWidth') && inputs.isSelected ? `<div class="timeline-block-handles_container">
<button class="timeline-block-handles_left-handle"></button>
<button class="timeline-block-handles_right-handle"></button>
</div>` : `<span></span>`,
e => (
  onClick(e, '.timeline-block-handles_plus', emit(expandBlock, inputs.animator, inputs.timeline, inputs.block, inputs.timelineBar)),
  onDrag(e, '.timeline-block-handles_left-handle', (e) => (moveAmount += e.movementX, updateBlockLeftPart(
    moveAmount - e.movementX,
    moveAmount,
    inputs.frameWidth,
    inputs.animator,
    inputs.timeline,
    inputs.block,
    inputs.timelineBar
  ))),
  onDrag(e, '.timeline-block-handles_right-handle', (e) => (moveAmount += e.movementX, updateBlockRightPart(
    moveAmount - e.movementX,
    moveAmount,
    inputs.frameWidth,
    inputs.animator,
    inputs.timeline,
    inputs.block,
    inputs.timelineBar
  )))
)];
});

function emit<T extends (...args: any[]) => EditorAction>(func: T, ...params: Parameters<T>): () => void {
  return () => Mediator.raiseEvent<EditorDoActionEvent>('doEditorAction', func(...params));
}

function updateBlockLeftPart(prevMoveAmount: number, moveAmount: number, frameWidth: number, animator: Animator, timeline: Timeline, block: Block, timelineBar: TimelineBar) {
  const prevFramePosition = Math.floor(prevMoveAmount / frameWidth);
  const currentFramePosition = Math.floor(moveAmount / frameWidth);

  if (prevFramePosition === currentFramePosition) {
    return;
  }

  if (prevFramePosition > currentFramePosition) {
    emit(expandBlockLeft, animator, timeline, block, timelineBar, prevFramePosition - currentFramePosition)();
    return;
  }

  emit(reduceBlockLeft, animator, timeline, block, timelineBar, currentFramePosition - prevFramePosition)();
}


function updateBlockRightPart(prevMoveAmount: number, moveAmount: number, frameWidth: number, animator: Animator, timeline: Timeline, block: Block, timelineBar: TimelineBar) {
  const prevFramePosition = Math.floor(prevMoveAmount / frameWidth);
  const currentFramePosition = Math.floor(moveAmount / frameWidth);

  if (prevFramePosition === currentFramePosition) {
    return;
  }

  if (prevFramePosition > currentFramePosition) {
    emit(reduceBlock, animator, timeline, block, prevFramePosition - currentFramePosition)();
    return;
  }

  emit(expandBlock, animator, timeline, block, timelineBar, currentFramePosition - prevFramePosition)();
}
