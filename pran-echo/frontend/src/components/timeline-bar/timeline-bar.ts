import './timeline-bar.css';
import { ActionType, Animator, Timeline, TimelineAction } from 'pran-animation-frontend';
import { Component } from '../../framework/component';
import { inlineComponent } from '../../framework/inline-component';
import { Container } from '../container/container';
import { Block, ClearBlock, createTimelineBlock, ImageBlock } from '../timeline-block/timeline-block';

function updateBlocks(inputs: { timeline: Timeline; animator: Animator; frameWidth: number }, timelineBlocksContainer: Container) {
  const totalFrames = inputs.animator.totalFrames;
  const blocks = identifyBlocks(inputs.timeline.timelineActions, totalFrames);
  timelineBlocksContainer.clear();
  createBlockComponents(blocks, inputs.frameWidth, inputs.timeline, inputs.animator, timelineBlocksContainer);
}

export const createTimelineBar = inlineComponent<{ timeline: Timeline, animator: Animator, frameWidth: number }>(controls => {
  const timelineBlocksContainer = Container.CreateEmptyElement('div', 'timeline-bar_block-container');
  let unsubscribe: () => void;

  controls.setup('timeline-bar', 'timeline-bar');
  controls.onInputsChange = inputs => {
    controls.mandatoryInput('timeline')
    && controls.mandatoryInput('animator')
    && controls.mandatoryInput('frameWidth');
    updateBlocks(inputs, timelineBlocksContainer);
    unsubscribe?.();
    unsubscribe = inputs.animator.onTimelineChange(() => (updateBlocks(inputs, timelineBlocksContainer), controls.changed()));
  };
  controls.onDestroy = unsubscribe;

  return () => timelineBlocksContainer;
});

function identifyBlocks(timelineActions: readonly TimelineAction[], totalFrames: number): Block[] {
  const blocks = [];
  let currentBlock: ReturnType<typeof ClearBlock.Builder> | ReturnType<typeof ImageBlock.Builder> = null;
  let currentFrames: number = 0;

  timelineActions.forEach(a => {
    switch(a.type) {
      case ActionType.None:
        if (!currentBlock) {
          currentBlock = ClearBlock.Builder().addAction(a).addFrames(a.amount);
        } else {
          currentBlock.addFrames(a.amount).addAction(a);
        }
        currentFrames += a.amount;
        break;
      case ActionType.Draw:
        if (currentBlock) {
          blocks.push(currentBlock.build());
        }
        currentBlock = ImageBlock.Builder().withImage(a.image.src).addFrame();
        currentFrames++;
        break;
      case ActionType.Clear:
        if (currentBlock) {
          blocks.push(currentBlock.build());
        }
        currentBlock = ClearBlock.Builder().addAction(a).addFrame();
        currentFrames++;
        break;
      default:
        throw new Error("Unmapped action type");
    }
  });

  if (currentFrames < totalFrames) {
    currentBlock.addFrames(totalFrames - currentFrames);
  }
  blocks.push(currentBlock.build());

  return blocks;
}

function createBlockComponents(blocks: Block[], frameWidth: number, timeline: Timeline, animator: Animator, timelineBlocksContainer: Container): Component[] {
  return blocks.map(block => createTimelineBlock().setInputs({ block, frameWidth, timeline, animator }).appendTo(timelineBlocksContainer));
}
