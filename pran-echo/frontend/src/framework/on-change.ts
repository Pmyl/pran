export function onChange(element: HTMLElement, selector: string, action: (e: MouseEvent & { target: HTMLInputElement}) => void) {
  const elementThatListens = element.querySelector(selector);

  if (!elementThatListens.hasAttribute('data-change-listener')) {
    elementThatListens.setAttribute('data-change-listener', 'true');
    elementThatListens.addEventListener('change', action);
  }
}
