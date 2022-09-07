import { clear, drawId, ManagerTimelineAction, wait } from 'pran-animation-frontend';

export function animationToTimelineActions(frames: { frameStart: number, frameEnd: number, imageId: string }[]): ManagerTimelineAction[] {
  let currentFrame: number = 0;

  return frames.flatMap(frame => {
    const actions: ManagerTimelineAction[] = [];

    if (frame.frameStart === currentFrame + 1) {
      actions.push(clear());
    } else if (frame.frameStart > currentFrame) {
      actions.push(clear());
      actions.push(wait(frame.frameStart - currentFrame - 1));
    }

    actions.push(drawId(frame.imageId));
    if (frame.frameEnd - frame.frameStart > 1) {
      actions.push(wait(frame.frameEnd - frame.frameStart - 1));
    }
    currentFrame = frame.frameEnd + 1;

    return actions;
  });
}