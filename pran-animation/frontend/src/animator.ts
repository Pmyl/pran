import { Timeline } from './timeline';

export class Animator {
  private _timelines: Timeline[] = [];

  public tick(amount: number = 1): void {
    for (let i = 0; i < this._timelines.length; i++) {
      this._timelines[i].tick(amount);
    }
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