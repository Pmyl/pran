export const setProperty = (element: HTMLElement, selector: string, propName: string, propValue: string | null) => {
  const elementWithProperty = element.querySelector(selector) as HTMLElement;

  elementWithProperty.style.setProperty(propName, propValue);
};