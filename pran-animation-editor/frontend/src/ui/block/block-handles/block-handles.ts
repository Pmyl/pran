import './block-handles.css';
import { Animator, Timeline } from 'pran-animation-frontend';
import { inlineComponent, onClick, onDrag } from 'pran-gular-frontend';
import { Block } from '../../../core/block/block';
import { expandBlock } from '../../../core/editor-queue/actions/expand-block';
import { expandBlockLeft } from '../../../core/editor-queue/actions/expand-block-left';
import { reduceBlock } from '../../../core/editor-queue/actions/reduce-block';
import { reduceBlockLeft } from '../../../core/editor-queue/actions/reduce-block-left';
import { EditorAction, EditorDoActionEvent } from '../../../core/editor-queue/editor-queue';
import { Mediator } from '../../../core/mediator/mediator';
import { TimelineBar } from '../../../core/timeline/timeline-bar';

type HandlesInputs = { isSelected: boolean, frameWidth: number, animator: Animator, timeline: Timeline, block: Block, timelineBar: TimelineBar };

export const createTimelineBlockHandles = inlineComponent<HandlesInputs>(controls => {
  controls.setup('block-handles', 'block-handles');
  let moveAmount: number = 0;

  controls.onInputChange = {
    isSelected: controls.changed
  };

  return inputs => [controls.mandatoryInput('frameWidth') && inputs.isSelected ? `<div class="block-handles_container">
<button class="block-handles_left-handle"></button>
<button class="block-handles_right-handle"></button>
</div>` : `<span></span>`,
e => (
  onClick(e, '.block-handles_plus', emit(expandBlock, inputs.animator, inputs.timeline, inputs.block, inputs.timelineBar)),
  onDrag(e, '.block-handles_left-handle', (e) => (moveAmount += e.movementX, updateBlockLeftPart(
    moveAmount - e.movementX,
    moveAmount,
    inputs.frameWidth,
    inputs.animator,
    inputs.timeline,
    inputs.block,
    inputs.timelineBar
  ))),
  onDrag(e, '.block-handles_right-handle', (e) => (moveAmount += e.movementX, updateBlockRightPart(
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
