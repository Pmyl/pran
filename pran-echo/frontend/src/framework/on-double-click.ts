export function onDoubleClick(element: HTMLElement, selector: string, action: (e: MouseEvent & { target: HTMLInputElement}) => void) {
  element.querySelectorAll(selector).forEach(elementThatListens => {
    onDoubleClickElement(elementThatListens, action);
  });
}

export function onDoubleClickElement(element: Element, action: (e: MouseEvent & { target: HTMLInputElement}) => void) {
  if (!element.hasAttribute('data-dblclick-listener')) {
    element.setAttribute('data-dblclick-listener', 'true');
    element.addEventListener('dblclick', action);
  }
}