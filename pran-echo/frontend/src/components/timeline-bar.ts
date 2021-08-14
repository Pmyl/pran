import { Timeline } from 'pran-animation-frontend';

export class TimelineBar {
  private _parent: HTMLElement;
  private _timeline: Timeline;

  public init(timeline: Timeline, parent: HTMLElement) {
    this._parent = parent;
    this._timeline = timeline;
    this._parent.append(this._generateContent());
  }

  private _generateContent(): HTMLElement {
    const div = document.createElement('div');
    div.innerHTML = 'wow' + (this._timeline as any)._currentWait;

    return div;
  }
}