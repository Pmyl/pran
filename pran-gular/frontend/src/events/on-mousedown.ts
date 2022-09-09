const listener: WeakMap<Element, () => void> = new WeakMap();

export function onMousedownElement(element: Element, action: (e: MouseEvent & { target: HTMLInputElement}) => void) {
  if (element.hasAttribute('data-mousedown-listener')) {
    listener.get(element)();
  } else {
    element.setAttribute('data-mousedown-listener', 'true');
  }

  element.addEventListener('mousedown', action);
  listener.set(element, () => element.removeEventListener('mousedown', action));
}
