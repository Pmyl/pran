export enum Keys {
  Escape = 'Escape'
}

const listenerStacks: Map<string, ((e: KeyboardEvent) => void)[]> = new Map();

/**
 * Global keydown check, this has to be called once per listener that has to be added (compared to other onX that can be called multiple times).
 * This is because it's global and multiple sources can ask to listen for the same key. When that happens we create a stack of listener priority.
 * If this is temporary it needs to be removed by calling the returned callback.
 */
export function onKeydown(key: Keys, action: (e: Event) => void): () => void {
  listenerStacks.has(key) || listenerStacks.set(key, []);

  if (listenerStacks.get(key).length) {
    document.removeEventListener('keydown', listenerStacks.get(key)[0]);
  }
  const listener: (e: KeyboardEvent) => void = (e: KeyboardEvent) => e.code === key && action(e);
  document.addEventListener('keydown', listener);
  listenerStacks.get(key).unshift(listener);

  return () => {
    document.removeEventListener('keydown', listenerStacks.get(key)[0]);
    listenerStacks.get(key).splice(listenerStacks.get(key).indexOf(listener), 1);
    if (listenerStacks.get(key).length) {
      document.addEventListener('keydown', listenerStacks.get(key)[0]);
    }
  };
}
