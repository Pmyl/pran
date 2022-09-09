const listener: WeakMap<Element, () => void> = new WeakMap();

export function onMouseupElement(element: Element, action: (e: MouseEvent & { target: HTMLInputElement}) => void) {
  if (element.hasAttribute('data-mouseup-listener')) {
    listener.get(element)();
  } else {
    element.setAttribute('data-mouseup-listener', 'true');
  }

  element.addEventListener('mouseup', action);
  listener.set(element, () => element.removeEventListener('mouseup', action));
}
