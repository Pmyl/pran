import { Component, RenderResult } from '../../framework/component';

export class Container extends Component {
  private _subComponents: (string | Component)[] = [];

  protected constructor(selector: string, initialClass?: string) {
    super(selector, initialClass);
  }

  public clear(): void {
    for (let i = 0; i < this._subComponents.length; i++) {
      const subComponent: string | Component = this._subComponents[i];

      if (subComponent instanceof Component) {
        subComponent.destroy();
      }
    }
    this._subComponents = [];
  }

  public append(component: string | Component) {
    this._subComponents.push(component);
    this.render();
  }

  protected _render(): RenderResult {
    return this._subComponents;
  }

  public static CreateEmptyElement(selector: string, initialClass?: string): Container;

  public static CreateEmptyElement(parent: Container, selector: string, initialClass?: string): Container;
  public static CreateEmptyElement(parentOrSelector: string | Container, selectorOrInitialClass?: string, initialClass?: string): Container {
    if (this._isString(parentOrSelector)) {
      return new Container(parentOrSelector, selectorOrInitialClass);
    }

    return new Container(selectorOrInitialClass, initialClass).appendTo(parentOrSelector);
  }

  public static CreateBody(): Container {
    const container = new Container("rubbish");
    container.componentElement = document.body;

    return container;
  }

  private static _isString(value: string | HTMLElement | Component): value is string {
    return typeof value === 'string';
  }
}