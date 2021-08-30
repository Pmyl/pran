export function onMousedownElement(element: Element, action: (e: MouseEvent & { target: HTMLInputElement}) => void) {
  if (!element.hasAttribute('data-mousedown-listener')) {
    element.setAttribute('data-mousedown-listener', 'true');
    element.addEventListener('mousedown', action);
  }
}