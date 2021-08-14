import { Component, ParentElement } from '../../framework/component';

export class Container extends Component {
  private constructor(selector: string, initialClass?: string) {
    super(selector, initialClass);
  }

  protected _render(): string {
    return '';
  }
  
  public static CreateEmptyElement(selector: string, initialClass?: string): Component;
  public static CreateEmptyElement(parent: ParentElement, selector: string, initialClass?: string): Component;
  public static CreateEmptyElement(parentOrSelector: string | ParentElement, selectorOrInitialClass?: string, initialClass?: string): Component {
    if (this._isString(parentOrSelector)) {
      return new Container(parentOrSelector, selectorOrInitialClass);
    }

    return new Container(selectorOrInitialClass, initialClass).appendTo(parentOrSelector);
  }

  private static _isString(value: string | HTMLElement | Component): value is string {
    return typeof value === 'string';
  }
}