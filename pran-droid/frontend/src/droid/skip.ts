export const enum SkipType {
  AfterTime = 'AfterTime',
  AfterStep = 'AfterStep',
}

export type PranDroidSkip = { type: SkipType.AfterTime, ms: number } | { type: SkipType.AfterStep, extraMs?: number };