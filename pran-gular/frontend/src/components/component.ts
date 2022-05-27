import { Container } from './container';

export type RenderResult = string | Component<object | null> | (string | Component<object | null>)[];

export type Immutable<T> = T extends Function ? T : {
  readonly [K in keyof T]: Immutable<T[K]>;
};

export type EmptyObject = {
  [K in any] : never
}

export abstract class Component<T extends object | null = EmptyObject> {
  public readonly selector: string;
  public componentElement: HTMLElement;
  public get inputs(): Immutable<T> {
    return this._inputs as Immutable<T>;
  }
  private _lastRenderedItems: (string | Component<object | null>)[] = [];
  private _holdRender: boolean;
  private _hasRenderedAtLeastOnce: boolean;
  private _hasRerendered: boolean;

  protected static _updatingInputsComponent: Component<object | null>;
  protected static _wantToRenderDuringUpdatingInputs: boolean = false;
  protected _isTemplate: boolean = false;
  protected _inputs: T = {} as T;

  constructor(selector: string, initialClass?: string) {
    this.selector = selector;
    this.componentElement = document.createElement(selector);
    if (initialClass) {
      this.componentElement.classList.add(initialClass);
    }
  }

  public render(): this | null {
    if (this._holdRender) {
      Component._wantToRenderDuringUpdatingInputs = true;
      return this;
    }

    this._hasRerendered = true;

    const isFirstRender = !this._hasRenderedAtLeastOnce;
    this._hasRenderedAtLeastOnce = true;
    let toRender = this._render();
    
    if (!toRender) {
      return;
    }

    toRender = Array.isArray(toRender) ? toRender : [toRender];

    this._lastRenderedItems
      .filter(item => item instanceof Component)
      .forEach(item => (item as Component)._hasRerendered = false);

    if (this._lastRenderedItems.length === toRender.length) {
      for (let i = 0; i < toRender.length; i++){
        const element: string | Component<object | null> = toRender[i];
        let newChild: HTMLElement | null;

        if (!this._isComponent(element)) {
          newChild = this._htmlToElement(element);
        } else if (this._lastRenderedItems[i] === element) {
          if (this._isComponent(element)) {
            element._hasRerendered = true;
          }
          continue;
        } else if (element._isTemplate) {
          newChild = element.render()?.componentElement.firstChild as HTMLElement;
        } else {
          newChild = element.render()?.componentElement;
        }

        this.componentElement.children[i].replaceWith(newChild);
      }
    } else {
      this.componentElement.innerHTML = '';

      for (const renderItem of toRender) {
        let child: HTMLElement;
        if (this._isComponent(renderItem)) {
          if (renderItem._isTemplate) {
            child = renderItem.render()?.componentElement.firstChild as HTMLElement;
          } else {
            child = renderItem.render()?.componentElement;
          }
        } else {
          child = this._htmlToElement(renderItem);
        }

        this.componentElement.append(child);
      }
    }

    this._lastRenderedItems
      .filter(item => item instanceof Component)
      .filter(item => !(item as Component)._hasRerendered)
      .forEach(item => (item as Component).destroy());

    this._lastRenderedItems = toRender.slice();
    this._postRender(this.componentElement);
    
    if (isFirstRender) {
      this._afterFirstRender();
    }
    
    return this;
  }
  
  public setInput<K extends keyof T>(name: K, input: T[K]): this {
    return this.setInputs({ [name]: input } as unknown as Partial<T>);
  }
  
  public setInputs(inputs: Partial<T>): this {
    Object.assign(this._inputs, inputs);

    this._holdRender = true;
    if (!Component._updatingInputsComponent) {
      Component._updatingInputsComponent = this;
    }
    this._onInputsChange?.();
    Object.keys(inputs).forEach(key => {
      this._onInputChange(key);
    });

    this._holdRender = false;
    if (Component._wantToRenderDuringUpdatingInputs && Component._updatingInputsComponent._hasRenderedAtLeastOnce) {
      Component._updatingInputsComponent.render();
    }
    
    if (Component._updatingInputsComponent === this) {
      Component._updatingInputsComponent = null;
    }

    return this;
  }
  
  public destroy(): void {
    this._onDestroy();
  }

  public appendTo(parent: Container): this {
    parent.append(this);
    return this;
  }
  
  public setData(id: string, value: string): this {
    this.componentElement.setAttribute(id, value);
    return this;
  }

  private _htmlToElement(html: string): HTMLElement {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstChild as HTMLElement;
  }

  private _isComponent(element: unknown | Component<object | null>): element is Component<object | null> {
    return element instanceof Component;
  }

  protected _afterFirstRender(): void {}

  protected _onInputChange(name: string): void {}

  protected _onInputsChange(): void {}

  protected _onDestroy(): void {}

  protected abstract _render(): RenderResult;
  
  protected _postRender(componentToRender: HTMLElement): void {};
}