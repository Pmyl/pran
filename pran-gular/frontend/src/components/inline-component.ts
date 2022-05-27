import { Component, EmptyObject, Immutable, RenderResult } from './component';
import { mandatoryInput } from './mandatory-input';

type InputChangeHooks<TInputs> = {
  [key in keyof TInputs]: (changed: TInputs[key], inputs: Immutable<TInputs>) => void;
};

type SideInputChangeHooks<TInputs, TSideInputs> = {
  [key in keyof TSideInputs]: (changed: TSideInputs[key], sideInputs: Partial<TSideInputs>, inputs: Immutable<TInputs>) => void;
};

export interface ComponentControls<TInputs extends object, TSideInputs extends object = {}> {
  setup: (selector: string, initialClass?: string) => void;
  mandatoryInput: (inputName: keyof TInputs) => boolean;
  changed(): void;
  onInputsChange?: (inputs: TInputs) => void;
  onInputChange?: Partial<InputChangeHooks<TInputs>>;
  setSideInput: <TInputName extends keyof TSideInputs>(inputName: TInputName, input: TSideInputs[TInputName]) => void;
  onSideInputChange?: SideInputChangeHooks<TInputs, TSideInputs>;
  afterFirstRender?: () => void;
  onDestroy?: () => void;
}

export function inlineComponent<TInputs extends object = EmptyObject, TSideInputs extends object = null>(
  componentFunction: (controls: ComponentControls<TInputs, TSideInputs>) => (inputs: TInputs) => RenderResult | [RenderResult, (component: HTMLElement) => void]
): (inputs?: TInputs) => Component<TInputs> {
  return (inputs?: TInputs) => {
    let _selector, _initialClass, component: Component<TInputs>, sideInputs: Partial<TSideInputs> = {};

    const componentControls: ComponentControls<TInputs, TSideInputs> = {
      setup(selector: string, initialClass?: string) {
        _selector = selector;
        _initialClass = initialClass
      },
      mandatoryInput: (inputName: keyof TInputs) => mandatoryInput(component, inputName),
      changed: () => component.render(),
      setSideInput: <TK extends keyof TSideInputs>(inputName: TK, input: TSideInputs[TK]) => {
        sideInputs[inputName] = input;
        componentControls.onSideInputChange[inputName](input, sideInputs, component.inputs);
      }
    };

    const renderFn = componentFunction(componentControls)

    component = new (class InlinedComponent extends Component<TInputs> {
      private _postRenderFn: null | ((componentToRender: HTMLElement) => void);

      constructor() {
        if (!_selector) {
          throw new Error('inline components needs to be set up with a selector. Use controls.setup');
        }
        super(_selector, _initialClass);
      }
      
      public setInput<K extends keyof TInputs>(name: K, input: TInputs[K]) {
        return this.setInputs({ [name]: input } as unknown as Partial<TInputs>);
      }

      public setInputs(inputs: Partial<TInputs>): this {
        super.setInputs(inputs);
        return this;
      }

      protected _afterFirstRender(): void {
        componentControls.afterFirstRender?.();
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