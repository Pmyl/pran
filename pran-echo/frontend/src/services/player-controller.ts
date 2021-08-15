import { Animator } from 'pran-animation-frontend';

export enum PlayerState {
  Play,
  Stop,
  Pause
}

export class PlayerController {
  public get state(): PlayerState {
    return this._state;
  }

  private _animator: Animator;
  private _fps: number = 60;
  private _hasFullStopped: boolean = true;
  private _isLooping: boolean = false;
  private _onStateChangeSubscribers: ((newState: PlayerState) => void)[] = [];
  private _state: PlayerState;

  constructor(animator: Animator) {
    this._animator = animator;
  }
  
  public setFps(fps: number) {
    this._fps = fps;
  }

  public play() {
    this._applyStateChange(PlayerState.Play);

    if (!this._hasFullStopped) {
      return;
    }

    this._hasFullStopped = false;
    let fpsInterval, now, then, elapsed;

    const animate = () => {
      if (this._state === PlayerState.Play) {
        requestAnimationFrame(animate);
      } else {
        this._hasFullStopped = true;
        return;
      }
      now = performance.now();
      elapsed = now - then;
      if (elapsed > fpsInterval) {
        this._animator.tick();
        if (this._isLooping && this._animator.totalFrames === this._animator.currentFrame) {
          this._animator.restart();
        }
        then = now - (elapsed % fpsInterval);
      }
    };

    fpsInterval = 1000 / this._fps;
    then = performance.now();
    animate();
  }

  public pause() {
    this._applyStateChange(PlayerState.Pause);
  }

  public stop() {
    this._animator.restart();
    this._applyStateChange(PlayerState.Stop);
  }

  public setLoop(loop: boolean) {
    this._isLooping = loop;
  }
  
  public onStateChange(cb: (newState: PlayerState) => void): () => void {
    this._onStateChangeSubscribers.push(cb);
    return () => this._onStateChangeSubscribers.splice(this._onStateChangeSubscribers.indexOf(cb), 1);
  }

  public pickFrame(frame: number) {
    this._animator.pickFrame(frame);
  }

  private _applyStateChange(state: PlayerState) {
    this._state = state;

    for (const subscriber of this._onStateChangeSubscribers) {
      subscriber(state);
    }
  }
}