import { onMousedownElement } from './on-mousedown';
import { onMouseupElement } from './on-mouseup';

export function onDrag(element: HTMLElement, selector: string, action: (e: MouseEvent) => void) {
  const elementThatListen = element.querySelector(selector);

  if (elementThatListen && !elementThatListen.hasAttribute('data-drag-listener')) {
    elementThatListen.setAttribute('data-drag-listener', 'true');
    dragOnClick(elementThatListen, action);
  }
}

function dragOnClick(element: Element, action: (e: MouseEvent) => void) {
  element.requestPointerLock = element.requestPointerLock || (element as any).mozRequestPointerLock;
  document.exitPointerLock = document.exitPointerLock || (document as any).mozExitPointerLock;

  onMousedownElement(element, () => element.requestPointerLock());
  onMouseupElement(element, () => document.exitPointerLock());

  document.addEventListener('pointerlockchange', lockChangeAlert, false);
  document.addEventListener('mozpointerlockchange', lockChangeAlert, false);
  
  function lockChangeAlert() {
    if (document.pointerLockElement === element || (document as any).mozPointerLockElement === element) {
      document.addEventListener("mousemove", action, false);
    } else {
      document.removeEventListener("mousemove", action, false);
    }
  }
}