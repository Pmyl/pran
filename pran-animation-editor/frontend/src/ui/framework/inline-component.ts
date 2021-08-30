import { Component, EmptyObject, Immutable, RenderResult } from './component';
import { mandatoryInput } from './mandatory-input';

type InputChangeHooks<T> = {
  [key in keyof T]: (changed: T[key], inputs: Immutable<T>) => void;
};

type SideInputChangeHooks<T, TS> = {
  [key in keyof TS]: (changed: TS[key], sideInputs: Partial<TS>, inputs: Immutable<T>) => void;
};

export interface ComponentControls<T extends object, TE extends object = {}> {
  setup: (selector: string, initialClass?: string) => void;
  mandatoryInput: (inputName: keyof T) => boolean;
  changed(): void;
  onInputsChange?: (inputs: T) => void;
  onInputChange?: Partial<InputChangeHooks<T>>;
  setSideInput: <TK extends keyof TE>(inputName: TK, input: TE[TK]) => void;
  onSideInputChange?: SideInputChangeHooks<T, TE>;
  onDestroy?: () => void;
}

export function inlineComponent<T extends object = EmptyObject, TS extends object = null>(
  componentFunction: (controls: ComponentControls<T, TS>) => (inputs: T) => RenderResult | [RenderResult, (component: HTMLElement) => void]
): (inputs?: T) => Component<T> {
  return (inputs?: T) => {
    let _selector, _initialClass, component: Component<T>, sideInputs: Partial<TS> = {};

    const componentControls: ComponentControls<T, TS> = {
      setup(selector: string, initialClass?: string) {
        _selector = selector;
        _initialClass = initialClass
      },
      mandatoryInput: (inputName: keyof T) => mandatoryInput(component, inputName),
      changed: () => component.render(),
      setSideInput: <TK extends keyof TS>(inputName: TK, input: TS[TK]) => {
        sideInputs[inputName] = input;
        componentControls.onSideInputChange[inputName](input, sideInputs, component.inputs);
      }
    };

    const renderFn = componentFunction(componentControls)

    component = new (class InlinedComponent extends Component<T> {
      private _postRenderFn: null | ((componentToRender: HTMLElement) => void);

      constructor() {
        if (!_selector) {
          throw new Error('inline components needs to be set up with a selector. Use controls.setup');
        }
        super(_selector, _initialClass);
      }
      
      public setInput<K extends keyof T>(name: K, input: T[K]) {
        return this.setInputs({ [name]: input } as unknown as Partial<T>);
      }

      public setInputs(inputs: Partial<T>): this {
        super.setInputs(inputs);
        return this;
      }
      
      protected _onDestroy(): void {
        componentControls.onDestroy?.();
      }
      
      protected _onInputsChange(): void {
        componentControls.onInputsChange?.(this._inputs);
      }
      
      protected _onInputChange(name: string): void {
        componentControls.onInputChange?.[name]?.(this._inputs[name], this._inputs);
      }

      protected _render(): RenderResult {
        const rendered = renderFn(this._inputs);

        if (this._isRenderResult(rendered)) {
          this._postRenderFn = null;
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
      component.setInputs(inputs);
    }

    return component;
  };
}