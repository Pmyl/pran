import { Animator } from 'pran-animation-frontend';

export enum PlayerState {
  Play,
  Stop,
  Pause,
  End
}

export class PlayerController {
  public get state(): PlayerState {
    return this._state;
  }

  public get fps(): number {
    return this._fps;
  }

  public get playbackRate(): number {
    return this._playbackRate;
  }

  private _animator: Animator;
  private _fps: number = 60;
  private _playbackRate: number = 1;
  private _hasFullStopped: boolean = true;
  private _isLooping: boolean = false;
  private _onStateChangeSubscribers: ((newState: PlayerState) => (Promise<void> | void))[] = [];
  private _onFramePickedSubscribers: ((frame: number) => void)[] = [];
  private _state: PlayerState;

  constructor(animator: Animator) {
    this._animator = animator;
  }

  public setFps(fps: number) {
    this._fps = fps;
  }

  public async play() {
    await this._applyStateChange(PlayerState.Play);

    if (!this._hasFullStopped) {
      return;
    }

    this._hasFullStopped = false;
    let fpsInterval, now, then, elapsed;

    const animate = () => {
      if (this._state === PlayerState.Play || this._state === PlayerState.End && this._animator.hasLoopingTimelines) {
        requestAnimationFrame(animate);
      } else {
        this._hasFullStopped = true;
        return;
      }
      now = performance.now();
      elapsed = now - then;
      if (elapsed > fpsInterval) {
        this._animator.tick();
        if (this._state !== PlayerState.End && this._animator.nonLoopingTotalFrames === this._animator.currentFrame) {
          this._emitStateChange(PlayerState.End);
          if (this._isLooping) {
            this._animator.restart();
            this._emitStateChange(PlayerState.Play);
          } else if (!this._animator.hasLoopingTimelines) {
            this._applyStateChange(PlayerState.Stop);
          }
        }
        then = now - (elapsed % fpsInterval);
      }
    };

    fpsInterval = 1000 / (this._fps * this._playbackRate);
    then = performance.now();
    animate();
  }

  public async setPlaybackRate(rate: number) {
    this._playbackRate = rate;
  }

  public async pause() {
    await this._applyStateChange(PlayerState.Pause);
  }

  public async stop() {
    this.pickFrame(0);
    await this._applyStateChange(PlayerState.Stop);
  }

  public setLoop(loop: boolean) {
    this._isLooping = loop;
  }

  public onStateChange(cb: (newState: PlayerState) => (Promise<void> | void)): () => void {
    this._onStateChangeSubscribers.push(cb);
    return () => this._onStateChangeSubscribers.splice(this._onStateChangeSubscribers.indexOf(cb), 1);
  }

  public pickFrame(frame: number) {
    this._animator.pickFrame(frame);

    for (const subscriber of this._onFramePickedSubscribers) {
      subscriber(frame);
    }
  }

  public onFramePicked(cb: (frame: number) => void): () => void {
    this._onFramePickedSubscribers.push(cb);
    return () => this._onFramePickedSubscribers.splice(this._onFramePickedSubscribers.indexOf(cb), 1);
  }

  private async _applyStateChange(state: PlayerState) {
    if (this._state === state) return;

    this._state = state;

    for (const subscriber of this._onStateChangeSubscribers) {
      await subscriber(state);
    }
  }

  private async _emitStateChange(state: PlayerState) {
    for (const subscriber of this._onStateChangeSubscribers) {
      await subscriber(state);
    }
  }
}