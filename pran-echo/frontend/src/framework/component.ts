export type ParentElement = HTMLElement | Component;

export abstract class Component {
  public componentElement: HTMLElement;

  protected constructor(parent: ParentElement, selector: string, initialClass?: string) {
    if (!parent) {
      throw new Error("Component constructor has to be called");
    }

    if (this._isComponent(parent)) {
      parent = parent.componentElement;
    }
    
    this.componentElement = document.createElement(selector);
    if (initialClass) {
      this.componentElement.classList.add(initialClass);
    }
    parent.append(this.componentElement);
  }

  public render() {
    const template = document.createElement('template');
    template.innerHTML = this._render().trim();
    const renderedComponent = template.content.firstChild as HTMLElement;
    this.componentElement.innerHTML = renderedComponent.outerHTML;
    this._postRender(this.componentElement);
  }

  private _isComponent(parent: HTMLElement | Component): parent is Component {
    return parent instanceof Component;
  }
  
  protected abstract _render(): string;
  protected _postRender(componentToRender: HTMLElement): void {};
}