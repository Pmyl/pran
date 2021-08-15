import { Component, RenderResult } from './component';

export function staticElement(html: string): Component {
  const component = new (class extends Component {
    constructor() {
      super('should-never-render');
      this._isTemplate = true;
    }

    protected _render(): RenderResult {
      return html;
    }
  })();
  component.render();

  return component;
}
