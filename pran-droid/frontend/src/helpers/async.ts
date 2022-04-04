export function waitFor(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}