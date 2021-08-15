export type ParentElement = HTMLElement | Component;

export type RenderResult = string | (string | Component)[];

type Immutable<T> = {
  readonly [K in keyof T]: Immutable<T[K]>;
}

export abstract class Component<T extends object = {}> {
  public readonly selector: string;
  public componentElement: HTMLElement;
  public get inputs(): Immutable<T> {
    return this._inputs;
  }
  protected _inputs: T = {} as T;

  protected constructor(selector: string, initialClass?: string) {
    this.selector = selector;
    this.componentElement = document.createElement(selector);
    if (initialClass) {
      this.componentElement.classList.add(initialClass);
    }
  }

  public render() {
    const template = document.createElement('template');
    const toRender = this._render();
    
    if (!toRender) {
      return;
    }

    if (Array.isArray(toRender)) {
      this.componentElement.innerHTML = '';

      for (const renderItem of toRender) {
        let child: HTMLElement;
        if (this._isComponent(renderItem)) {
          child = renderItem.componentElement;
        } else {
          child = this._htmlToElement(renderItem);
        }
        this.componentElement.append(child);
      }
    } else {
      template.innerHTML = toRender.trim();
      const renderedComponent = template.content.firstChild as HTMLElement;
      this.componentElement.innerHTML = renderedComponent.outerHTML;
    }

    this._postRender(this.componentElement);
  }

  public appendTo(parent: ParentElement): this {
    if (this._isComponent(parent)) {
      parent = parent.componentElement;
    }
    parent.append(this.componentElement);

    return this;
  }
  
  public setInput<K extends keyof T>(name: K, input: T[K]): this {
    this._inputs[name] = input;
    return this;
  }
  
  public setInputs(inputs: Partial<T>): this {
    Object.assign(this._inputs, inputs);
    return this;
  }
  
  private _htmlToElement(html: string): HTMLElement {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstChild as HTMLElement;
  }

  private _isComponent(parent: unknown | Component): parent is Component {
    return parent instanceof Component;
  }
  protected abstract _render(): RenderResult;
  
  protected _postRender(componentToRender: HTMLElement): void {};
}