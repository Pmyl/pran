import { MainCanvasController } from 'pran-phonemes-frontend';
import { Timeline } from '../timeline/timeline';

export class Animator {
  public get totalFrames(): number {
    return this._totalFrames;
  };
  public get currentFrame(): number {
    return this._currentFrame;
  };
  private _canvasController: MainCanvasController;
  private _totalFrames: number = 0;
  private _currentFrame: number = 0;

  constructor(canvasController: MainCanvasController) {
    this._canvasController = canvasController;
  }

  public get timelines(): readonly Timeline[] {
    return this._timelines;
  };

  private readonly _timelines: Timeline[] = [];

  public tick(amount: number = 1): void {
    if (this._currentFrame === this._totalFrames) {
      this._canvasController.redraw();
      return;
    }

    for (let i = 0; i < this._timelines.length; i++) {
      this._timelines[i].tick(amount);
    }

    this._canvasController.redraw();
    this._currentFrame = Math.min(this._currentFrame + amount, this._totalFrames);
  }

  public addTimeline(timeline: Timeline) {
    this._timelines.push(timeline);
    this._totalFrames = Math.max(this._totalFrames, timeline.frames);
  }

  public restart(): void {
    for (let i = 0; i < this._timelines.length; i++) {
      this._timelines[i].restart();
    }
    this._currentFrame = 0;
  }
}