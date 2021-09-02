import { CanvasController } from '../canvas-controller/canvas-controller';
import { mouthAnimation } from './mouth-animation';

function fakeCanvasController(actions: [string, any][]): CanvasController {
  return {
    draw: (imageToDraw: HTMLImageElement) => actions.push(['draw', imageToDraw]),
    clear: () => actions.push(['clear', null]),
    waitForMs: (ms: number) => {
      actions.push(['wait', ms]);
      return Promise.resolve();
    },
    dry_clear: () => {},
    dry_draw: () => {},
    dry_replace: () => {},
    addLayer(_: string): CanvasController { return this; },
    addLayerAt(_: string, __: number): CanvasController { return this; },
    id: ''
  };
}

type FakePromise<T = unknown> = Promise<T> & { resolve: (value: T) => void, reject: () => void };
function createFakePromise<T = unknown>(): FakePromise<T> {
  let resolve: (value: T) => void, reject: () => void;

  const promise = new Promise<T>((r, rj) => {
    resolve = r;
    reject = rj;
  });

  return Object.assign(promise, { resolve, reject });
}

describe('mouth-animation', () => {
  it('should clear and draw the provided image', async () => {
    const imageInput: HTMLImageElement = { src: 'a src' } as HTMLImageElement;
    const actions: [string, any][] = [];

    await mouthAnimation([imageInput], fakeCanvasController(actions));

    expect(actions).toEqual([['clear', null], ['draw', imageInput]]);
  });

  it('should draw the provided images every 100 ms', async () => {
    const imageInput: HTMLImageElement = { src: 'a src' } as HTMLImageElement;
    const actions: [string, any][] = [];

    await mouthAnimation([imageInput, imageInput], fakeCanvasController(actions));

    expect(actions).toEqual([['clear', null], ['draw', imageInput], ['wait', 100], ['clear', null], ['draw', imageInput]]);
  });

  it('should actually await the wait promise between draws', (done) => {
    const imageInput: HTMLImageElement = { src: 'a src' } as HTMLImageElement;
    const actions: [string, any][] = [];

    const canvasController: CanvasController = fakeCanvasController(actions);
    const fakePromise: FakePromise<void> = createFakePromise<void>();
    canvasController.waitForMs = (_: number) => fakePromise;

    mouthAnimation([imageInput, imageInput], canvasController);
    
    setTimeout(() => {
      expect(actions).toEqual([['clear', null], ['draw', imageInput]]);
      fakePromise.resolve();

      setTimeout(() => {
        expect(actions).toEqual([['clear', null], ['draw', imageInput], ['clear', null], ['draw', imageInput]]);
        done();
      }, 1);
    }, 1);
  });
});