export abstract class Component {
  private readonly _componentElement: HTMLElement;

  protected constructor(parent: HTMLElement) {
    this._componentElement = document.createElement('tempComponentTag');
    parent.append(this._componentElement);
  }

  public render() {
    const template = document.createElement('template');
    template.innerHTML = this._render().trim();
    this._componentElement.outerHTML = (template.content.firstChild as HTMLElement).outerHTML;
  }
  
  protected abstract _render(): string;
}