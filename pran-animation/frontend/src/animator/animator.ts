import { MainCanvasController } from '../canvas-controller/main-canvas-controller';
import { Timeline } from '../timeline/timeline';
import { TimelineAction } from '../timeline/timeline-action';
import { TimelineChange, TimelineChangeType } from './events/events';
import { v4 as uuidv4 } from 'uuid';

export interface TimelineConfig {
  actions: TimelineAction[];
  /**
   * Set the timeline as looping, this ensures that the animation doesn't end even though the tick goes over the total
   * frame count.
   */
  loop: boolean;
}

export class Animator {
  public get totalFrames(): number {
    return this._totalFrames;
  };
  public get nonLoopingTotalFrames(): number {
    return this._nonLoopingTotalFrames;
  };
  public get currentFrame(): number {
    return this._currentFrame;
  };
  public get hasLoopingTimelines(): boolean {
    return this._hasLoopingTimelines;
  };
  private _onFrameChangeSubscribers: ((frame: number) => void)[] = [];
  private _onTotalFramesChangeSubscribers: ((totalFrames: number) => void)[] = [];
  private _onTimelineChangeSubscribers: ((timeline: Timeline, change: TimelineChange) => void)[] = [];
  private _canvasController: MainCanvasController;
  private _totalFrames: number = 0;
  private _nonLoopingTotalFrames: number = 0;
  private _currentFrame: number = 0;
  private _hasLoopingTimelines: boolean = false;

  constructor(canvasController: MainCanvasController) {
    this._canvasController = canvasController;
  }

  public get timelines(): readonly Timeline[] {
    return this._timelines;
  };

  private readonly _timelines: Timeline[] = [];

  public tick(amount: number = 1): void {
    if (this._currentFrame === this._totalFrames && !this.hasLoopingTimelines) {
      this._canvasController.redraw();
      return;
    }

    for (let i = 0; i < this._timelines.length; i++) {
      this._timelines[i].tick(amount);
    }

    this._canvasController.redraw();
    this._applyFrameChange(Math.min(this._currentFrame + amount, this._totalFrames), true);
  }

  public addTimeline(config: TimelineAction[] | TimelineConfig): Timeline {
    return this.addTimelineAt(this.timelines.length, config);
  }

  public addTimelineAt(index: number, config: TimelineAction[] | TimelineConfig): Timeline {
    let animation: TimelineAction[],
      loop: boolean;

    if (Array.isArray(config)) {
      animation = config;
      loop = false;
    } else {
      animation = config.actions;
      loop = config.loop;
    }

    const timeline = new Timeline(this._canvasController.addLayerAt(uuidv4(), index), animation);

    loop && timeline.activateLoop();
    this._hasLoopingTimelines = this._hasLoopingTimelines || loop;

    this._timelines.splice(index, 0, timeline);
    this._recalculateTotalFrames();
    this._notifyTimelineChanged(timeline, {
      type: TimelineChangeType.Add,
      index
    });

    return timeline;
  }

  public removeTimeline(timeline: Timeline): number {
    const index = this._timelines.indexOf(timeline);
    this._canvasController.removeLayer(timeline.layer.id);

    this._timelines.splice(index, 1);
    this._hasLoopingTimelines = this._timelines.some(timeline => timeline.isLoop);
    this._recalculateTotalFrames();
    this._notifyTimelineChanged(timeline, {
      type: TimelineChangeType.Remove,
      index
    });

    return index;
  }

  public restart(): void {
    this._restart(true);
  }

  public onFrameChange(cb: (frame: number) => void): () => void {
    this._onFrameChangeSubscribers.push(cb);
    return () => this._onFrameChangeSubscribers.splice(this._onFrameChangeSubscribers.indexOf(cb), 1);
  }

  public onTotalFramesChange(cb: (totalFrames: number) => void): () => void {
    this._onTotalFramesChangeSubscribers.push(cb);
    return () => this._onTotalFramesChangeSubscribers.splice(this._onTotalFramesChangeSubscribers.indexOf(cb), 1);
  }

  public onTimelineChange(cb: (timeline: Timeline, change: TimelineChange) => void): () => void {
    this._onTimelineChangeSubscribers.push(cb);
    return () => this._onTimelineChangeSubscribers.splice(this._onTimelineChangeSubscribers.indexOf(cb), 1);
  }

  public pickFrame(frame: number): void {
    if (frame === 0) {
      this._restart(true);
    } else {
      this._restart(false);
      this.tick(frame);
    }
  }

  public insertTimelineAction(timeline: Timeline, frame: number, action: TimelineAction) {
    timeline.insertTimelineAction(frame, action);
    this._recalculateTotalFrames();
    this._notifyTimelineChanged(timeline, { type: TimelineChangeType.InsertAction, frame, action });
  }

  public expandTimelineAction(timeline: Timeline, amount: number, action: TimelineAction) {
    timeline.expandTimelineAction(amount, action);
    this._recalculateTotalFrames();
    this._notifyTimelineChanged(timeline, { type: TimelineChangeType.ExpandAction, amount, action });
  }

  public removeTimelineAction(timeline: Timeline, action: TimelineAction) {
    timeline.removeTimelineAction(action);
    this._recalculateTotalFrames();
    this._notifyTimelineChanged(timeline, { type: TimelineChangeType.RemoveAction, action });
  }

  public reduceTimelineAction(timeline: Timeline, amount: number, action: TimelineAction) {
    timeline.reduceTimelineAction(amount, action);
    this._recalculateTotalFrames();
    this._notifyTimelineChanged(timeline, { type: TimelineChangeType.ReduceAction, amount, action });
  }

  public replaceTimelineAction(timeline: Timeline, actionToReplace: TimelineAction, replacement: TimelineAction) {
    timeline.replaceTimelineAction(actionToReplace, replacement);

    this._recalculateTotalFrames();
    this._notifyTimelineChanged(timeline, {
      type: TimelineChangeType.ReplaceSameType,
      actionToReplace: actionToReplace,
      replacement: replacement
    });
  }

  private _recalculateTotalFrames() {
    this._applyTotalFramesChange(Math.max(...this._timelines.map(t => t.frames)));
    this._nonLoopingTotalFrames = Math.max(...this._timelines.map(t => t.isLoop ? 0 : t.frames));
  }

  private _restart(notify: boolean): void {
    for (let i = 0; i < this._timelines.length; i++) {
      this._timelines[i].restart();
    }

    this._applyFrameChange(0, notify);
  }

  private _applyFrameChange(frame: number, notify: boolean) {
    const prevFrame = this._currentFrame;
    this._currentFrame = frame;

    if (notify && prevFrame !== this._currentFrame) {
      for (const subscriber of this._onFrameChangeSubscribers) {
        subscriber(frame);
      }
    }
  }

  private _applyTotalFramesChange(total: number) {
    const prevTotal = this._totalFrames;
    this._totalFrames = total;

    if (prevTotal !== this._totalFrames) {
      for (const subscriber of this._onTotalFramesChangeSubscribers) {
        subscriber(total);
      }
    }
  }

  private _notifyTimelineChanged(timeline: Timeline, change: TimelineChange) {
    for (const subscriber of this._onTimelineChangeSubscribers) {
      subscriber(timeline, change);
    }
  }
}