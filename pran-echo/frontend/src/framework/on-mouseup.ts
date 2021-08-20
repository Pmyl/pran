export function onMouseupElement(element: Element, action: (e: MouseEvent & { target: HTMLInputElement}) => void) {
  if (!element.hasAttribute('data-mouseup-listener')) {
    element.setAttribute('data-mouseup-listener', 'true');
    element.addEventListener('mouseup', action);
  }
}