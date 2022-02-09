import { Component, EmptyObject, RenderResult } from './component';

export class Container<T extends object | null = EmptyObject> extends Component<T> {
  private _subComponents: (string | Component<object | null>)[] = [];

  constructor(selector: string, initialClass?: string) {
    super(selector, initialClass);
  }

  public clear(): void {
    for (let i = 0; i < this._subComponents.length; i++) {
      const subComponent: string | Component<object | null> = this._subComponents[i];

      if (subComponent instanceof Component) {
        subComponent.destroy();
      }
    }
    this._subComponents = [];
  }

  public insertAt(component: Component<object | null>, index: number) {
    this._subComponents.splice(index, 0, component);
    this.render();
  }

  public removeAt(index: number) {
    const subComponent = this._subComponents.splice(index, 1);
    if (subComponent instanceof Component) {
      subComponent.destroy();
    }
    this.render();
  }

  public remove(component: string | Component<object | null>) {
    this.removeAt(this._subComponents.indexOf(component));
  }

  public append(component: string | Component<object | null>): this {
    this._subComponents.push(component);
    this.render();
    
    return this;
  }

  protected _onDestroy() {
    this.clear();
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