import { ComplexRenderer } from '../src/components/component';

export const createComplexRendererFixture = () => {
  const hostElement = document.createElement('test-host');
  const renderer = new ComplexRenderer(hostElement);
  document.body.innerHTML = '';
  document.body.append(hostElement);

  return new Fixture(renderer, hostElement);
};

class Fixture {
  public hostElement: HTMLElement;
  private readonly _renderer: ComplexRenderer;

  constructor(renderer: ComplexRenderer, hostElement: HTMLElement) {
    this._renderer = renderer;
    this.hostElement = hostElement;
  }

  public render(cb: (renderer: ComplexRenderer) => any) {
    this._renderer.startRender();
    cb(this._renderer);
    this._renderer.endRender();
  }
}