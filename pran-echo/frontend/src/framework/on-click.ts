export function onClick(element: HTMLElement, selector: string, action: (e: MouseEvent & { target: HTMLInputElement}) => void) {
  element.querySelectorAll(selector).forEach(elementThatListens => {
    onClickElement(elementThatListens, action);
  });
}

export function onClickElement(element: Element, action: (e: MouseEvent & { target: HTMLInputElement}) => void) {
  if (!element.hasAttribute('data-click-listener')) {
    element.setAttribute('data-click-listener', 'true');
    element.addEventListener('click', action);
  }
}