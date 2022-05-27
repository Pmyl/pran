import { Container } from './container';

export function staticElement(html: string): Container & { staticContent: HTMLElement } {
  const staticElement = new (class extends Container {
    public staticContent: HTMLElement;

    constructor() {
      super('should-never-render');
      this._isTemplate = true;
    }

    public render(): this | null {
      const result = super.render();
      this.staticContent = this.componentElement.firstChild as HTMLElement;
      return result;
    }
  })();
  staticElement.append(html);

  return staticElement;
}
