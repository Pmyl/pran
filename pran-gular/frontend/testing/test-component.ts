import { Component } from '../src/components/component';

export type TestComponent = Component<object> & { renders: number; inputChanges: number; isDestroyed: boolean; };

export const createTestComponent = () => {
  const testComponents: TestComponent[] = [];

  return {
    instances: testComponents,
    component: { component: class extends Component<object> {
        public renders: number = 0;
        public inputChanges: number = 0;
        public isDestroyed: boolean = false;

        constructor() {
          super('test-component');
          this._setComplexRendering();
          testComponents.push(this);
        }

        protected _onInputsChange() {
          this.inputChanges++;
        }

        protected _onDestroy() {
          this.isDestroyed = true;
        }

        protected _complexRender = () => {
          this.renders++;
        };
    }}
  };
};
