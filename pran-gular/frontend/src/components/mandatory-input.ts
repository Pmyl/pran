import { Component } from './component';

export function mandatoryInput<T extends object>(component: Component<T>, inputName: keyof Component['inputs']) {
  if (!component.inputs[inputName]) {
    throw new Error(`${String(inputName)} input is mandatory in component ${component.selector} before rendering`);
  }

  return true;
}