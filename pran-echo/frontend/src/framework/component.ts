import { Container } from '../components/container/container';

export type RenderResult = string | Component | (string | Component)[];

export type Immutable<T> = {
  readonly [K in keyof T]: Immutable<T[K]>;
}

export abstract class Component<T extends object = {}> {
  public readonly selector: string;
  public componentElement: HTMLElement;
  public get inputs(): Immutable<T> {
    return this._inputs;
  }
  private _lastRenderedItems: (string | Component)[] = [];
  private _holdRender: boolean;
  private _hasRenderedAtLeastOnce: boolean;
  protected static _updatingInputsComponent: Component;
  protected static _wantToRenderDuringUpdatingInputs: boolean = false;
  protected _isTemplate: boolean = false;
  protected _inputs: T = {} as T;

  protected constructor(selector: string, initialClass?: string) {
    this.selector = selector;
    this.componentElement = document.createElement(selector);
    if (initialClass) {
      this.componentElement.classList.add(initialClass);
    }
  }

  public render(): this {
    if (this._holdRender) {
      Component._wantToRenderDuringUpdatingInputs = true;
      return this;
    }

    this._hasRenderedAtLeastOnce = true;
    let toRender = this._render();
    
    if (!toRender) {
      return;
    }

    toRender = Array.isArray(toRender) ? toRender : [toRender];

    if (this._lastRenderedItems.length === toRender.length) {
      for (let i = 0; i < toRender.length; i++){
        const element: string | Component = toRender[i];

        if (!this._isComponent(element)) {
          this.componentElement.children[i].replaceWith(this._htmlToElement(element));
        } else if (this._lastRenderedItems[i] === element && element._isTemplate) {
          continue;
        } else if (this._lastRenderedItems[i] === element && !element._isTemplate) {
          // element.render();
        } else if (element._isTemplate) {
          this.componentElement.children[i].replaceWith(
            element.render().componentElement.firstChild as HTMLElement
          );
        } else {
          this.componentElement.children[i].replaceWith(
            element.render().componentElement
          );
        }
      }
    } else {
      this.componentElement.innerHTML = '';

      for (const renderItem of toRender) {
        let child: HTMLElement;
        if (this._isComponent(renderItem)) {
          if (renderItem._isTemplate) {
            child = renderItem.render().componentElement.firstChild as HTMLElement;
          } else {
            child = renderItem.render().componentElement;
          }
        } else {
          child = this._htmlToElement(renderItem);
        }
        this.componentElement.append(child);
      }
    }

    this._lastRenderedItems = toRender.slice();
    this._postRender(this.componentElement);
    
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

  private _htmlToElement(html: string): HTMLElement {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstChild as HTMLElement;
  }

  private _isComponent(parent: unknown | Component): parent is Component {
    return parent instanceof Component;
  }

  protected _onInputChange(name: string): void {}

  protected _onInputsChange(): void {}

  protected _onDestroy(): void {}

  protected abstract _render(): RenderResult;
  
  protected _postRender(componentToRender: HTMLElement): void {};
}