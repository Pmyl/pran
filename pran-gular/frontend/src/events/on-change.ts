const listener: WeakMap<Element, () => void> = new WeakMap();

export function onChange(element: HTMLElement, selector: string, action: (e: MouseEvent & { target: HTMLInputElement}) => void) {
  element.querySelectorAll(selector).forEach(elementThatListens => {
    onChangeElement(elementThatListens, action);
  });
}

export function onChangeElement(element: Element, action: (e: MouseEvent & { target: HTMLInputElement}) => void) {
  if (element.hasAttribute('data-change-listener')) {
    listener.get(element)();
  } else {
    element.setAttribute('data-change-listener', 'true');
  }

  element.addEventListener('input', action);
  listener.set(element, () => element.removeEventListener('input', action));
}
