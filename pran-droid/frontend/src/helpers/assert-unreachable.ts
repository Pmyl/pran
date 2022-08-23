export function assertUnreachable(value: never): never {
  throw new Error("Should never get here");
}