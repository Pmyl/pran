export abstract class Component {
  private _componentElement: HTMLElement;

  protected constructor(parent: HTMLElement, selector: string, initialClass?: string) {
    this._componentElement = document.createElement(selector);
    this._componentElement.classList.add(initialClass);
    parent.append(this._componentElement);
  }

  public render() {
    const template = document.createElement('template');
    template.innerHTML = this._render().trim();
    const renderedComponent = template.content.firstChild as HTMLElement;
    this._componentElement.innerHTML = renderedComponent.outerHTML;
  }
  
  protected abstract _render(): string;
}