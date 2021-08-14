import { Component, ParentElement } from '../../framework/component';

export class Container extends Component {
  private constructor(parent: ParentElement, selector: string, initialClass?: string) {
    super(parent, selector, initialClass);
  }

  protected _render(): string {
    return '';
  }
  
  public static CreateEmptyElement(parent: ParentElement, selector: string, initialClass?: string): Component {
    return new Container(parent, selector, initialClass);
  }
}