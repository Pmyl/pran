import { Container } from '../components/container/container';

export function staticElement(html: string): Container {
  const staticElement = new (class extends Container {
    constructor() {
      super('should-never-render');
      this._isTemplate = true;
    }
  })();
  staticElement.append(html);

  return staticElement;
}
