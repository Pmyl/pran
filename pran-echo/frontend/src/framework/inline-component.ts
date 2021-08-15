import { Component, RenderResult } from './component';
import { mandatoryInput } from './mandatory-input';

export interface ComponentControls<T> {
  setup: (selector: string, initialClass?: string) => void;
  mandatoryInput: (inputName: keyof T) => boolean;
  changed(): void;
  onInputChange?: (inputs: T) => void;
}

export function inlineComponent<T extends object>(componentFunction: (controls: ComponentControls<T>) => (inputs: T) => RenderResult | [RenderResult, (component: HTMLElement) => void]): (inputs?: T) => Component<T> {
  return (inputs?: T) => {
    let _selector, _initialClass, component: Component<T>;

    const componentControls: ComponentControls<T> = {
      setup(selector: string, initialClass?: string) {
        _selector = selector;
        _initialClass = initialClass
      },
      mandatoryInput: (inputName: keyof T) => mandatoryInput(component, inputName),
      changed: () => component.render()
    };

    const renderControls = componentFunction(componentControls);

    component = new (class InlinedComponent extends Component<T> {
      private _postRenderFn: null | ((componentToRender: HTMLElement) => void);

      constructor() {
        if (!_selector) {
          throw new Error('inline components needs to be set up with a selector. Use controls.setup');
        }
        super(_selector, _initialClass);
      }
      
      public setInput<K extends keyof T>(name: K, input: T[K]) {
        super.setInput(name, input);
        componentControls.onInputChange?.(this._inputs);
        return this;
      }

      public setInputs(inputs: Partial<T>): this {
        super.setInputs(inputs);
        componentControls.onInputChange?.(this._inputs);
        return this;
      }

      protected _render(): string | (string | Component)[] {
        const rendered = renderControls(this._inputs);
        if (this._isRenderResult(rendered)) {
          return rendered;
        } else {
          this._postRenderFn = rendered[1];
          return rendered[0];
        }
      }

      protected _postRender(componentToRender: HTMLElement) {
        this._postRenderFn?.(componentToRender);
      }

      private _isRenderResult(result: unknown | RenderResult): result is RenderResult {
        return !result || typeof result === 'string' || typeof result[1] !== 'function';
      }
    });

    if (inputs) {
      for (const key in inputs) {
        component.setInput(key, inputs[key]);
      }
    }

    return component;
  };
}