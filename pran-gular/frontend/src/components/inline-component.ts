import { ComplexRenderer, Component, EmptyObject, Immutable, NewableComponent, RenderResult } from './component';
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
  setComplexRendering: () => void;
  changed(): void;
  onInputsChange?: (inputs: TInputs) => void;
  onInputChange?: Partial<InputChangeHooks<TInputs>>;
  setSideInput: <TInputName extends keyof TSideInputs>(inputName: TInputName, input: TSideInputs[TInputName]) => void;
  onSideInputChange?: SideInputChangeHooks<TInputs, TSideInputs>;
  afterFirstRender?: () => void;
  onDestroy?: () => void;
}

export type PostRenderingHandler = (component: HTMLElement) => void;
export type BaseRendering<TInputs> = (inputs: TInputs) => [RenderResult, PostRenderingHandler] | RenderResult;
export type ComplexRendering<TInputs> = (inputs: TInputs, complexRenderer: ComplexRenderer) => void | ComplexRenderer | PostRenderingHandler;

function inlineComponentConstructor<TInputs extends object = EmptyObject, TSideInputs extends object = {}>(
  componentFunction: (controls: ComponentControls<TInputs, TSideInputs>) => BaseRendering<TInputs> | ComplexRendering<TInputs>
): NewableComponent<TInputs> {
  return class InlinedComponent extends Component<TInputs> {
    private _postRenderFn: null | ((componentToRender: HTMLElement) => void);
    private _renderFn: BaseRendering<TInputs> | ComplexRendering<TInputs>;
    private _componentControls: ComponentControls<TInputs, TSideInputs>;

    protected _render = (): RenderResult => {
      const rendered = (this._renderFn as BaseRendering<TInputs>)(this._inputs);

      if (this._isRenderResult(rendered)) {
        this._postRenderFn = null;
        return rendered;
      } else {
        this._postRenderFn = rendered[1];
        return rendered[0];
      }
    };

    protected _complexRender = (): void => {
      const rendered = (this._renderFn as ComplexRendering<TInputs>)(this._inputs, this._cr);

      if (this._hasComplexPostRender(rendered)) {
        this._postRenderFn = rendered;
      } else {
        this._postRenderFn = null;
      }
    };

    constructor() {
      let _selector, _initialClass, _isComplexRendering = false, sideInputs: Partial<TSideInputs> = {};

      const componentControls: ComponentControls<TInputs, TSideInputs> = {
        setup(selector: string, initialClass?: string) {
          _selector = selector;
          _initialClass = initialClass
        },
        mandatoryInput: (inputName: keyof TInputs) => mandatoryInput(this, inputName),
        changed: () => this.render(),
        setSideInput: <TK extends keyof TSideInputs>(inputName: TK, input: TSideInputs[TK]) => {
          sideInputs[inputName] = input;
          componentControls.onSideInputChange[inputName](input, sideInputs, this.inputs);
        },
        setComplexRendering: () => {
          _isComplexRendering = true;
        }
      };

      const renderFn = componentFunction(componentControls)
      if (!_selector) {
        throw new Error('inline components needs to be set up with a selector. Use controls.setup');
      }

      super(_selector || 'broken', _initialClass);

      this._renderFn = renderFn;
      this._componentControls = componentControls;
      if (_isComplexRendering) {
        this._setComplexRendering();
      }
    }

    public setInput<K extends keyof TInputs>(name: K, input: TInputs[K]) {
      return this.setInputs({ [name]: input } as unknown as Partial<TInputs>);
    }

    public setInputs(inputs: Partial<TInputs>): this {
      super.setInputs(inputs);
      return this;
    }

    protected _afterFirstRender(): void {
      this._componentControls.afterFirstRender?.();
    }

    protected _onDestroy(): void {
      this._componentControls.onDestroy?.();
    }

    protected _onInputsChange(): void {
      this._componentControls.onInputsChange?.(this._inputs);
    }

    protected _onInputChange(name: string): void {
      this._componentControls.onInputChange?.[name]?.(this._inputs[name], this._inputs);
    }

    protected _postRender(componentToRender: HTMLElement) {
      this._postRenderFn?.(componentToRender);
    }

    private _isRenderResult(result: unknown | RenderResult): result is RenderResult {
      return !result || typeof result === 'string' || typeof result[1] !== 'function';
    }

    private _hasComplexPostRender(result: ReturnType<ComplexRendering<object>>): result is PostRenderingHandler {
      return !!result && typeof result === 'function';
    }
  };
}

export function inlineComponent<TInputs extends object = EmptyObject, TSideInputs extends object = null>(
  componentFunction: (controls: ComponentControls<TInputs, TSideInputs>) => BaseRendering<TInputs> | ComplexRendering<TInputs>
): { (inputs?: TInputs): Component<TInputs>; component: NewableComponent<TInputs> } {
  const constructor = inlineComponentConstructor<TInputs, TSideInputs>(componentFunction);
  const result = function(inputs?: TInputs) {
    let component: Component<TInputs> = new constructor();

    if (inputs) {
      component.setInputs(inputs);
    }

    return component;
  };

  result.component = constructor;

  return result;
}

export function inlineComponentOld<TInputs extends object = EmptyObject, TSideInputs extends object = null>(
  componentFunction: (controls: ComponentControls<TInputs, TSideInputs>) => BaseRendering<TInputs>
): { (inputs?: TInputs): Component<TInputs>; component: NewableComponent<TInputs> } {
  return inlineComponent(componentFunction)
}