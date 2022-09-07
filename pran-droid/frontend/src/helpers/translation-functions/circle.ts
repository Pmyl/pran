import { mapToArrayTranslations } from './helpers';

export function circleTranslationsXY(duration: number, centerX: number, centerY: number, radius: number, steps: number): [number, [number, number]][] {
  let points = [];
  execute(centerX, centerY, radius, (x, y) => {
    points.push([x, y]);
  });
  const topRight = points.filter(x => x[0] >= centerX && x[1] < centerY)
    .sort((a, b) => a[0] > b[0] ? 1 : a[0] === b[0] && a[1] > b[1] ? 1 : -1);
  const bottomRight = points.filter(x => x[0] >= centerX && x[1] >= centerY)
    .sort((a, b) => a[0] < b[0] ? 1 : a[0] === b[0] && a[1] > b[1] ? 1 : -1);
  const topLeft = points.filter(x => x[0] < centerX && x[1] < centerY)
    .sort((a, b) => a[0] > b[0] ? 1 : a[0] === b[0] && a[1] < b[1] ? 1 : -1);
  const bottomLeft = points.filter(x => x[0] < centerX && x[1] >= centerY)
    .sort((a, b) => a[0] < b[0] ? 1 : a[0] === b[0] && a[1] < b[1] ? 1 : -1);
  points = topRight.concat(bottomRight).concat(bottomLeft).concat(topLeft);

  let lastPoint = [0, 0];
  const translations = new Map<number, [number, number]>();
  const stepSize = points.length / steps;
  const pointDuration = duration / points.length;
  for(let i = 0; i + 0.01 < points.length; i += stepSize) {
    const index = Math.round(i);
    const translation: [number, number] = [lastPoint[0] - points[index][0], lastPoint[1] - points[index][1]];
    const existingTranslation: [number, number] = (translations.get(Math.round(i * pointDuration)) || [0, 0]);
    translations.set(Math.round(i * pointDuration), [existingTranslation[0] + translation[0], existingTranslation[1] + translation[1]])
    lastPoint = points[index];
  }

  console.log(points.length, steps, stepSize, translations, pointDuration)
  return mapToArrayTranslations(translations);
}

function execute(centerX, centerY, radius, putPixel) {
  let d = 3 - 2*radius;
  let x = 0;
  let y = radius;
  drawCircle(x, y);

  while(y >= x) {
    x++;
    if (d > 0) {
      y--;
      d = d + 4*(x - y) + 10;
    } else {
      d = d + 4*x + 6;
    }

    drawCircle(x, y);
  }

  function drawCircle(x, y) {
    putPixel(centerX + x, centerY + y);
    putPixel(centerX - x, centerY + y);
    putPixel(centerX + x, centerY - y);
    putPixel(centerX - x, centerY - y);
    putPixel(centerX + y, centerY + x);
    putPixel(centerX - y, centerY + x);
    putPixel(centerX + y, centerY - x);
    putPixel(centerX - y, centerY - x);
  }
}
