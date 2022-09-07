export function easeTranslations(easeFunction: EaseFunction, duration: number, start: number, end: number, steps: number): [number, number][] {
  const points = generatePoints(easeFunction, duration, start, end, steps);
  let lastPoint = 0;

  return points.reduce((acc, point) => {
    acc.push([~~point.time, lastPoint - point.value]);
    lastPoint = point.value;
    return acc;
  }, []);
}

export function easeIn(t) {
  return t * t;
}

export function flip(t) {
  return 1 - t;
}

export function easeOut(t) {
  return flip(easeIn(flip(t)));
}

export function easeInOut(t) {
  return lerp(easeIn(t), easeOut(t), t);
}

export function lerp(start: number, end: number, percentage: number) {
  return (start + (end - start) * percentage);
}

function generatePoints(easeFunction: EaseFunction, duration: number, start: number, end: number, steps: number): Array<{ percentage: number, time: number, step: number, value: number }> {
  const percentageIncrease = 100 / (steps - 1);
  let percentage = 0;
  let result = [];

  for (let step = 0; step < steps; step++) {
    const time = duration*percentage/100;
    const value = lerp(start, end, easeFunction(time/duration));
    result.push({ percentage, time, step, value });
    percentage += percentageIncrease;
  }

  return result;
}

type EaseFunction = (t: number) => number;