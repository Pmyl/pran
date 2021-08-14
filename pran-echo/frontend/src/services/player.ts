import { Animator } from 'pran-animation-frontend';

export class Player {
  private _animator: Animator;
  private _fps: number = 60;
  private _isPlaying: boolean;
  private _hasFullStopped: boolean = true;
  private _isLooping: boolean = false;

  constructor(animator: Animator) {
    this._animator = animator;
  }
  
  public setFps(fps: number) {
    this._fps = fps;
  }

  public play() {
    this._isPlaying = true;

    if (!this._hasFullStopped) {
      return;
    }

    this._hasFullStopped = false;
    let fpsInterval, now, then, elapsed;

    const animate = () => {
      if (this._isPlaying) {
        requestAnimationFrame(animate);
      } else {
        this._hasFullStopped = true;
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
    this._isPlaying = false;
  }

  public stop() {
    this._isPlaying = false;
    this._animator.restart();
  }

  public setLoop(loop: boolean) {
    this._isLooping = loop;
  }
}