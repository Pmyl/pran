import { Container } from './container';

export type RenderResult = string | Component<object | null> | (string | Component<object | null>)[];

export type Immutable<T> = T extends Function ? T : {
  readonly [K in keyof T]: Immutable<T[K]>;
};

export type EmptyObject = {
  [K in any] : never
}

type CreateElementInstruction = [`el_${string}`, HTMLElement];
type Instruction =
  ['endel', HTMLElement]
  | ['attr', HTMLElement, string, string]
  | ['text', HTMLElement]
  | ['html', HTMLElement]
  | CreateElementInstruction
  | ['cmpi', Component<object>]
  | ['cmp', NewableComponent<object>, Component<object>];

export class ComplexRenderer {
  private static _isDebugLogActive: boolean = false;
  private readonly _elementQueue: Array<HTMLElement> = [];
  private _instructions: Array<Instruction> = [];
  private _newInstructions: Array<Instruction> = [];
  private _currentInstructionIndex: number = 0;
  private _currentChildIndex: number = 0;
  private _openElements: Set<HTMLElement> = new Set();
  private _components: Set<Component> = new Set();
  private _newComponents: Set<Component> = new Set();
  private _newableComponents: Map<NewableComponent<object>, Set<Component<object>>> = new Map();
  private _newNewableComponents: Map<NewableComponent<object>, Set<Component<object>>> = new Map();
  private _log: (...args: any[]) => void;

  constructor(hostElement: HTMLElement, options: { isDebugLogActive?: boolean | undefined } = {}) {
    this._elementQueue.unshift(hostElement);
    options = Object.assign({ isDebugLogActive: ComplexRenderer._isDebugLogActive }, options);
    this._log = options.isDebugLogActive ? console.debug : () => {};
  }

  public static enableDebug() {
    ComplexRenderer._isDebugLogActive = true;
  }

  public static disableDebug() {
    ComplexRenderer._isDebugLogActive = false
  }

  public startRender() {
    this._newInstructions = [];
    this._currentChildIndex = 0;
    this._currentInstructionIndex = 0;
    this._openElements = new Set();
  }

  // Element
  public el(selector: string, classes?: string): this {
    const instruction: `el_${string}` = `el_${selector}`;
    let element: HTMLElement;

    let currentInstruction = this._instructions[this._currentInstructionIndex];

    if (!!currentInstruction && !this._isElementRelated(currentInstruction)) {
      this._undoInstructionsUntilElementRelated();
      currentInstruction = this._instructions[this._currentInstructionIndex];
    }

    if (!!currentInstruction && currentInstruction[0] === instruction && currentInstruction[1].parentElement === this._elementQueue[0]) {
      element = currentInstruction[1];
      this._currentInstructionIndex++;
    } else {
      element = this._createElement(selector);
      this._insertElementAt(this._elementQueue[0], element, this._currentChildIndex);
    }

    element.setAttribute('data-pa-pos', this._currentChildIndex.toString());
    element.className = classes ? classes : '';
    this._elementQueue.unshift(element);
    this._openElements.add(element);
    this._newInstructions.push([instruction, element]);
    this._currentChildIndex = 0;

    return this;
  }

  // Self closing Element
  public scel(selfClosingElement: string, classes?: string): this {
    return this.el(selfClosingElement, classes).endEl();
  }

  // End Element
  public endEl(): this {
    const newInstruction = `endel`;
    let currentInstruction = this._instructions[this._currentInstructionIndex];
    let closedElement: HTMLElement = this._elementQueue[0];

    const isDifferentInstruction = !!currentInstruction && (currentInstruction[0] !== newInstruction || currentInstruction[1] !== closedElement);
    const isEndingAssociatedElement = !!currentInstruction && this._getElementInstructionIsActingOn(currentInstruction) === closedElement;

    if (isDifferentInstruction) {
      if (isEndingAssociatedElement) {
        this._undoInstructionsOnEndEl(closedElement);
      }
    } else {
      this._currentInstructionIndex++;
    }

    this._elementQueue.shift();
    this._openElements.delete(closedElement);
    this._newInstructions.push([newInstruction, closedElement]);
    this._currentChildIndex = +closedElement.getAttribute('data-pa-pos') + 1;

    if (this._elementQueue.length === 0) {
      throw new Error('Too many endEl');
    }

    return this;
  }

  // Add attribute to current element
  public attr(name: string, value: string): this {
    const instruction = 'attr';
    const currentInstruction = this._instructions[this._currentInstructionIndex];

    if (!!currentInstruction
      && currentInstruction[0] === instruction
      && currentInstruction[1] === this._elementQueue[0]
      && currentInstruction[2] === name) {
      this._currentInstructionIndex++;
      currentInstruction[3] !== value && this._setElementAttr(this._elementQueue[0], name, value);
    } else {
      this._setElementAttr(this._elementQueue[0], name, value);
    }

    this._newInstructions.push([instruction, this._elementQueue[0], name, value]);
    return this;
  }

  // Text
  public text(text: string): this {
    const instruction = `text`;

    const currentInstruction = this._instructions[this._currentInstructionIndex];
    if (!!currentInstruction && currentInstruction[0] === instruction) {
      this._currentInstructionIndex++;
    }

    this._setElementText(this._elementQueue[0], text);
    this._newInstructions.push([instruction, this._elementQueue[0]]);

    return this;
  }

  // Html
  public html(content: string): this {
    const instruction = `html`;

    const currentInstruction = this._instructions[this._currentInstructionIndex];
    if (!!currentInstruction && currentInstruction[0] === instruction) {
      this._currentInstructionIndex++;
    }

    this._setElementHtml(this._elementQueue[0], content);
    this._newInstructions.push([instruction, this._elementQueue[0]]);

    return this;
  }

  // Component instance
  public cmpi(component: Component): this {
    const instruction = 'cmpi';

    const currentInstruction = this._instructions[this._currentInstructionIndex];

    if (!!currentInstruction && currentInstruction[0] === instruction && currentInstruction[1] === component) {
      this._currentInstructionIndex++;
    } else {
      if (!this._components.has(component)) {
        component.render();
        this._log(`+++ Component: ${component.selector}`);
      }
      this._elementQueue[0].append(component.componentElement)
    }

    this._newInstructions.push([instruction, component]);
    this._currentChildIndex++;
    this._newComponents.add(component);

    return this;
  }

  // Component
  public cmp<TInputs extends object>(cmp: { component: NewableComponent<TInputs> }, inputs: Partial<TInputs> = {}): this {
    const instruction = 'cmp';
    const currentInstruction = this._instructions[this._currentInstructionIndex];
    let instance: Component<TInputs>;

    if (!!currentInstruction && currentInstruction[0] === instruction && currentInstruction[1] === cmp.component) {
      instance = currentInstruction[2] as Component<TInputs>;
      if (this._getOrCreateNewableComponents(this._newableComponents, cmp.component).has(instance)) {
        // Component exists in same place, update inputs if needed
        if (!this._areInputsEqual(instance.inputs, inputs)) {
          instance.setInputs(inputs);
          instance.render();
        }
      } else {
        instance = this._insertComponentAtCurrentIndex(cmp, inputs);
      }
      this._currentInstructionIndex++;
    } else {
      instance = this._insertComponentAtCurrentIndex(cmp, inputs);
    }

    this._getOrCreateNewableComponents(this._newableComponents, cmp.component).delete(instance);
    this._getOrCreateNewableComponents(this._newNewableComponents, cmp.component).add(instance);
    this._newInstructions.push([instruction, cmp.component, instance]);
    this._currentChildIndex++;

    return this;
  }

  public endRender() {
    if (this._elementQueue.length !== 1) {
      throw new Error('Complex rendering error, missing closing tags')
    }

    this._undoInstructionsOnEndEl(this._elementQueue[0]);
    this._instructions = this._newInstructions;

    this._newComponents.forEach(cmp => !this._components.has(cmp) && cmp.destroy());
    this._components = this._newComponents;
    this._newComponents = new Set<Component>();
    this._newableComponents.forEach((instances, newableCmp) => {
      const newNewableComponents = this._getOrCreateNewableComponents(this._newNewableComponents, newableCmp);

      this._getOrCreateNewableComponents(this._newableComponents, newableCmp).forEach(instance => {
        !newNewableComponents.has(instance) && instance.destroy();
      });
    });
    this._newableComponents = this._newNewableComponents;
    this._newNewableComponents = new Map<NewableComponent<object>, Set<Component>>();
  }

  public div(classes?: string) {
    return this.el('div', classes);
  }

  public span(classes?: string) {
    return this.el('span', classes);
  }

  public p(classes?: string) {
    return this.el('p', classes);
  }

  public button(classes?: string) {
    return this.el('button', classes).attr('type', 'button');
  }

  public buttonSubmit(classes?: string) {
    return this.el('button', classes).attr('type', 'submit');
  }

  public h1(classes?: string) {
    return this.el('h1', classes);
  }

  public h2(classes?: string) {
    return this.el('h2', classes);
  }

  public h3(classes?: string) {
    return this.el('h3', classes);
  }

  private _insertComponentAtCurrentIndex<TInputs extends object>(cmp: { component: NewableComponent<TInputs> }, inputs: TInputs) {
    let instances: Set<Component<TInputs>> = this._getOrCreateNewableComponents(this._newableComponents, cmp.component);
    let instance: Component;

    if (instances.size > 0) {
      // Reuse existing instance from somewhere, it will be moved move into a new place
      const values = instances.values();
      const first = values.next();
      instance = first.value;
      instances.delete(instance);

      if (!this._areInputsEqual(instance.inputs, inputs)) {
        instance.setInputs(inputs);
      }
    } else {
      // Create brand new component instance
      instance = new cmp.component() as Component;
      !!inputs && instance.setInputs(inputs);
      instance.render();
      this._log(`+++ Component: ${instance.selector}`);
    }

    if (this._elementQueue[0].children.length === this._currentChildIndex) {
      this._elementQueue[0].append(instance.componentElement)
    } else {
      this._elementQueue[0].insertBefore(instance.componentElement, this._elementQueue[0].children[this._currentChildIndex])
    }

    return instance;
  }

  private _removeComponent(component: Component<object>) {
    this._log(`--- Component: ${component.selector}`);
    component.componentElement.remove();
  }
  private _getOrCreateNewableComponents<TInputs extends object>(newableComponents: Map<NewableComponent<object>, Set<Component<object>>>, component: NewableComponent<TInputs>) {
    if (!newableComponents.has(component)) {
      newableComponents.set(component, new Set());
    }

    return newableComponents.get(component) as Set<Component<TInputs>>;
  }

  private _createElement(selector: string): HTMLElement {
    const element = document.createElement(selector);
    this._log(`+++ Element: ${element.tagName}`);
    return element;
  }

  private _removeElement(element: HTMLElement): void {
    this._log(`--- Element: ${element.tagName}`);
    element.remove();
  }

  private _setElementText(element: HTMLElement, text: string): void {
    if (!text) {
      this._log(`--- Text: ${element.tagName}`);
    } else {
      this._log(`+++ Text: ${element.tagName} -> ${text}`);
    }
    element.innerText = text;
  }

  private _setElementAttr(element: HTMLElement, name: string, value: string | null): void {
    if (value === null) {
      this._log(`--- Attr: ${element.tagName} ${name}`);
      element.removeAttribute(name);
    } else {
      this._log(`+++ Attr: ${element.tagName} ${name} -> ${value}`);
      element.setAttribute(name, value);
    }
  }

  private _setElementHtml(element: HTMLElement, html: string): void {
    if (!html) {
      this._log(`--- Html: ${element.tagName}`);
    } else {
      this._log(`+++ Html: ${element.tagName} -> ${html}`);
    }
    element.innerHTML = html;
  }

  private _isCreateElementInstruction(instruction: Instruction): instruction is CreateElementInstruction {
    return instruction[0].startsWith('el_');
  }

  private _areInputsEqual(inputs1: object, inputs2: object): boolean {
    return !(!inputs1 || !inputs2) && (inputs1 === inputs2 || Object.keys(inputs1).every(key => inputs1[key] === inputs2[key])
      && Object.keys(inputs1).length === Object.keys(inputs2).length);
  }

  private _undoInstructionsOnEndEl(endedElement: HTMLElement): void {
    let currentInstruction = this._instructions[this._currentInstructionIndex];
    let currentRemovedElement = null;

    if (this._openElements.has(endedElement)) {
      while (!!currentInstruction && (currentInstruction[0] !== 'endel' || currentInstruction[1] !== endedElement)) {
        if (this._isCreateElementInstruction(currentInstruction)) {
          currentRemovedElement = currentInstruction[1];
          this._removeElement(currentRemovedElement);
        } else if (currentInstruction[0] === 'cmp' && !this._getOrCreateNewableComponents(this._newNewableComponents, currentInstruction[1]).has(currentInstruction[2])) {
          this._removeComponent(currentInstruction[2]);
        } else if (currentInstruction[0] === 'text' && currentInstruction[1] !== currentRemovedElement) {
          this._setElementText(currentInstruction[1], '');
        } else if (currentInstruction[0] === 'attr' && currentInstruction[1] !== currentRemovedElement) {
          this._setElementAttr(currentInstruction[1], currentInstruction[2], null);
        }
        currentInstruction = this._instructions[++this._currentInstructionIndex];
      }
    } else {
      const endedElementParent = endedElement.parentElement;
      while (!!currentInstruction && (currentInstruction[0] !== 'endel' || currentInstruction[1] !== endedElementParent)) {
        if (this._isCreateElementInstruction(currentInstruction)) {
          currentRemovedElement = currentInstruction[1];
          this._removeElement(currentRemovedElement);
        } else if (currentInstruction[0] === 'cmp' && !this._getOrCreateNewableComponents(this._newNewableComponents, currentInstruction[1]).has(currentInstruction[2])) {
          this._removeComponent(currentInstruction[2]);
        } else if (currentInstruction[0] === 'text' && currentInstruction[1] !== currentRemovedElement) {
          this._setElementText(currentInstruction[1], '');
        } else if (currentInstruction[0] === 'attr' && currentInstruction[1] !== currentRemovedElement) {
          this._setElementAttr(currentInstruction[1], currentInstruction[2], null);
        }
        currentInstruction = this._instructions[++this._currentInstructionIndex];
      }
    }

    this._currentInstructionIndex++;
  }

  private _undoInstructionsUntilElementRelated(): void {
    let currentInstruction = this._instructions[this._currentInstructionIndex];

    while (!!currentInstruction && !this._isElementRelated(currentInstruction)) {
      if (currentInstruction[0] === 'text') {
        this._setElementText(currentInstruction[1], '');
      } else if (currentInstruction[0] === 'attr') {
        this._setElementAttr(currentInstruction[1], currentInstruction[2], null);
      }
      currentInstruction = this._instructions[++this._currentInstructionIndex];
    }
  }
  // Example: el -> parent element, attr -> element

  private _getElementInstructionIsActingOn(instruction: Instruction): HTMLElement {
    switch (instruction[0]) {
      case 'text':
      case 'attr':
        return instruction[1];
      case 'cmp':
        return instruction[2].componentElement.parentElement;
      case 'endel':
        return instruction[1].parentElement;
      default:
        if (this._isCreateElementInstruction(instruction)) {
          return instruction[1].parentElement;
        }
        throw new Error(`Cannot find parent element of instruction, missing implementation for ${instruction[0]}`);
    }
  }

  private _isElementRelated(instruction: Instruction): boolean {
    switch (instruction[0]) {
      case 'endel':
      case 'cmp':
        return true;
      case 'text':
      case 'attr':
        return false;
      default:
        if (this._isCreateElementInstruction(instruction)) {
          return true;
        }
        throw new Error(`Cannot know if instruction is element related, missing implementation for ${instruction[0]}`);
    }
  }

  private _insertElementAt(parentElement: HTMLElement, childElement: HTMLElement, index: number) {
    if (parentElement.children.length > index) {
      parentElement.insertBefore(childElement, parentElement.children[index]);
    } else {
      parentElement.append(childElement);
    }
  }
}

export type NewableComponent<TInputs extends object> = new () => Component<TInputs>;

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
  protected _isComplex: boolean = false;
  protected _cr: ComplexRenderer;
  protected _complexRender?: () => void = null;
  protected _render?: () => RenderResult = null;

  constructor(selector: string, initialClass?: string) {
    this.selector = selector;
    this.componentElement = document.createElement(selector);
    if (initialClass) {
      this.componentElement.classList.add(initialClass);
    }
  }

  public render(): this | null {
    if (this._isComplex) {
      return this._doComplexRender();
    } else {
      return this._doRender();
    }
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

  private _doRender(): this | null {
    if (!this._render) {
      throw new Error('Complex component should override _render method to render.');
    }

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

  private _doComplexRender(): this | null {
    if (!this._complexRender) {
      throw new Error('Complex component should override _complexRender method to render.');
    }

    const isFirstRender = !this._hasRenderedAtLeastOnce;
    this._hasRenderedAtLeastOnce = true;
    this._cr.startRender();
    this._complexRender();
    this._cr.endRender();

    this._postRender(this.componentElement);

    if (isFirstRender) {
      this._afterFirstRender();
    }

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

  protected _setComplexRendering(options: { debugLog?: boolean | undefined } = {}): void {
    this._cr = new ComplexRenderer(this.componentElement, { isDebugLogActive: options.debugLog });
    this._isComplex = true;
  }

  protected _afterFirstRender(): void {}

  protected _onInputChange(name: string): void {}

  protected _onInputsChange(): void {}

  protected _onDestroy(): void {}

  protected _postRender(componentToRender: HTMLElement): void {};
}
