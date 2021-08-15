export function onClick(element: HTMLElement, selector: string, action: (e: MouseEvent & { target: HTMLInputElement}) => void) {
  const elementThatListens = element.querySelector(selector);

  if (!elementThatListens.hasAttribute('data-click-listener')) {
    elementThatListens.setAttribute('data-click-listener', 'true');
    elementThatListens.addEventListener('click', action);
  }
}