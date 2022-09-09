const listener: WeakMap<Element, () => void> = new WeakMap();

export function onClick(element: HTMLElement, selector: string, action: (e: MouseEvent & { target: HTMLInputElement}) => void) {
  element.querySelectorAll(selector).forEach(elementThatListens => {
    onClickElement(elementThatListens, action);
  });
}

export function onClickElement(element: Element, action: (e: MouseEvent & { target: HTMLInputElement}) => void) {
  if (element.hasAttribute('data-click-listener')) {
    listener.get(element)();
  } else {
    element.setAttribute('data-click-listener', 'true');
  }

  element.addEventListener('click', action);
  listener.set(element, () => element.removeEventListener('click', action));
}

export function onClickInverse(element: HTMLElement, selector: string, action: (e: MouseEvent & { target: HTMLInputElement}) => void): () => void {
  const selectedElements = [];
  element.querySelectorAll(selector).forEach(selectedElement => {
    selectedElements.push(selectedElement);
  });

  const listener = e => {
    if (!selectedElements.includes(e.target)) {
      action(e as any);
    }
  };
  document.addEventListener('click', listener);

  return () => document.removeEventListener('click', listener);
}
