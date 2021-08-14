import { MainCanvasController } from 'pran-phonemes-frontend';
import { Timeline } from '../timeline/timeline';

export class Animator {
  private _canvasController: MainCanvasController;

  constructor(canvasController: MainCanvasController) {
    this._canvasController = canvasController;
  }

  public get timelines(): readonly Timeline[] {
    return this._timelines;
  };

  private readonly _timelines: Timeline[] = [];

  public tick(amount: number = 1): void {
    for (let i = 0; i < this._timelines.length; i++) {
      this._timelines[i].tick(amount);
    }

    this._canvasController.redraw();
  }

  public addTimeline(timeline: Timeline) {
    this._timelines.push(timeline);
  }

  public restart(): void {
    for (let i = 0; i < this._timelines.length; i++) {
      this._timelines[i].restart();
    }
  }
}