import { Component } from './component';

export function mandatoryInput<T extends object>(component: Component<T>, inputName: keyof T) {
  if (!component.inputs[inputName]) {
    throw new Error(`${inputName} input is mandatory in component ${component.selector} before rendering`);
  }
  
  return true;
}