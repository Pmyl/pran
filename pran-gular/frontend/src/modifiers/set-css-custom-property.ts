export const setCssCustomProperty = (element: HTMLElement, propName: string, propValue: string | null) => {
  element.style.setProperty(propName, propValue);
};