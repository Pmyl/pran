import { MainCanvasController } from 'pran-phonemes-frontend';
import { Timeline } from '../timeline/timeline';

export class Animator {
  public get totalFrames(): number {
    return this._totalFrames;
  };
  public get currentFrame(): number {
    return this._currentFrame;
  };
  private _onFrameChangeSubscribers: ((frame: number) => void)[] = [];
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
    this._applyFrameChange(Math.min(this._currentFrame + amount, this._totalFrames), true);
  }

  public addTimeline(timeline: Timeline) {
    this._timelines.push(timeline);
    this._totalFrames = Math.max(this._totalFrames, timeline.frames);
  }

  public restart(): void {
    this._restart(true);
  }

  public onFrameChange(cb: (frame: number) => void): () => void {
    this._onFrameChangeSubscribers.push(cb);
    return () => this._onFrameChangeSubscribers.splice(this._onFrameChangeSubscribers.indexOf(cb), 1);
  }

  public pickFrame(frame: number): void {
    this._restart(false);
    this.tick(frame);
  }

  public _restart(notify: boolean): void {
    for (let i = 0; i < this._timelines.length; i++) {
      this._timelines[i].restart();
    }

    this._applyFrameChange(0, notify);
  }

  private _applyFrameChange(frame: number, notify: boolean) {
    this._currentFrame = frame;

    if (notify) {
      for (const subscriber of this._onFrameChangeSubscribers) {
        subscriber(frame);
      }
    }
  }
}