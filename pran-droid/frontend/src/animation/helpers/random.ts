export function randomFramesBetween(lowFrames: number, highFrames: number): number {
  return Math.floor(lowFrames + Math.random() * (highFrames - lowFrames));
}

export function randomFramesBetweenInMs(lowMs: number, highMs: number, fps: number): number {
  return randomFramesBetween(fps * lowMs / 1000, fps * highMs / 1000);
}