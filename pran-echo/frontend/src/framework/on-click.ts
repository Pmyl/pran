export function onClick(element: HTMLElement, selector: string, action: (e: MouseEvent & { target: HTMLInputElement}) => void) {
  element.querySelector(selector).addEventListener('click', action);
}