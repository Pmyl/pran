export const setProperty = (element: HTMLElement, selector: string, propName: string, propValue: string | null) => {
  const elementWithProperty = element.querySelector(selector) as HTMLElement;

  setPropertyElement(elementWithProperty, propName, propValue);
};

export const setPropertyElement = (element: HTMLElement, propName: string, propValue: string | null) => {
  element.style.setProperty(propName, propValue);
};