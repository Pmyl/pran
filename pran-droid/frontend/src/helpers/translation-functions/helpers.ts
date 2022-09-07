type ArrayTranslations = ArrayTranslation[];
type ArrayTranslation = [number, [number, number]];
type ArrayUnidirectionalTranslations = ArrayUnidirectionalTranslation[];
type ArrayUnidirectionalTranslation = [number, number];

export function concat(gap: number, ...translations: ArrayUnidirectionalTranslations[]): ArrayUnidirectionalTranslations {
  if (translations.length === 0) {
    return [];
  }

  let result: ArrayUnidirectionalTranslations = translations[0];

  for (let i = 1; i < translations.length; i++) {
    result = _concat(gap, result, translations[i]);
  }

  return result;
}

export function concatXY(gap: number, ...translations: ArrayTranslations[]): ArrayTranslations {
  if (translations.length === 0) {
    return [];
  }

  let result: ArrayTranslations = translations[0];

  for (let i = 1; i < translations.length; i++) {
    result = _concatXY(gap, result, translations[i]);
  }

  return result;
}

export function toXYMap(translationsX: ArrayUnidirectionalTranslations, translationsY: ArrayUnidirectionalTranslations): Map<number, [number, number]> {
  const translations = new Map<number, [number, number]>();

  for (let i = 0; i < translationsX.length; i++) {
    translations.set(translationsX[i][0], [translationsX[i][1], 0]);
  }

  for (let i = 0; i < translationsY.length; i++) {
    translations.set(translationsY[i][0], [translations.get(translationsY[i][0])?.[0] || 0, translationsY[i][1]]);
  }

  return translations;
}

export function toXY(translationsX: ArrayUnidirectionalTranslations, translationsY: ArrayUnidirectionalTranslations): ArrayTranslations {
  return mapToArrayTranslations(toXYMap(translationsX, translationsY));
}

export function merge(left: ArrayUnidirectionalTranslations, right: ArrayUnidirectionalTranslations): ArrayUnidirectionalTranslations {
  const translations = new Map<number, number>();

  for (let i = 0; i < left.length; i++) {
    translations.set(left[i][0], left[i][1]);
  }

  for (let i = 0; i < right.length; i++) {
    translations.set(right[i][0], (translations.get(right[i][0]) || 0) + right[i][1]);
  }

  return _mapToArrayUnidirectionalTranslations(translations);
}

export function mergeXY(left: ArrayTranslations, right: ArrayTranslations): ArrayTranslations {
  const leftX = _extractX(left);
  const rightX = _extractX(right);
  const leftY = _extractY(left);
  const rightY = _extractY(right);

  return toXY(merge(leftX, rightX), merge(leftY, rightY));
}

export function repeatXY(amount: number, xy: ArrayTranslations, gap: number = 1): ArrayTranslations {
  let result: ArrayTranslations = xy;

  for (let i = 0; i < amount - 1; i++) {
    result = _concatXY(gap, result, xy);
  }

  return result;
}

export function mapToArrayTranslations(map: Map<number, [number, number]>) {
  const mergedOutput: ArrayTranslations = [];

  map.forEach((translation, frame) => {
    mergedOutput.push([frame, translation]);
  });

  return mergedOutput;
}

function _concat(gap: number, left: ArrayUnidirectionalTranslations, right: ArrayUnidirectionalTranslations): ArrayUnidirectionalTranslations {
  const endPosition = left.reduce((acc, x) => acc + x[1], 0);
  const endFrame = left.reduce((acc, x) => Math.max(acc, x[0]), -1);

  right = right.map((item, i) => {
    return [item[0] + endFrame + gap, item[1] - (i === 0 ? endPosition : 0)];
  });

  return left.concat(right);
}

function _concatXY(gap: number, left: ArrayTranslations, right: ArrayTranslations): ArrayTranslations {
  const leftX = _extractX(left);
  const rightX = _extractX(right);
  const leftY = _extractY(left);
  const rightY = _extractY(right);

  return toXY(concat(gap, leftX, rightX), concat(gap, leftY, rightY));
}

function _extractX(translations: ArrayTranslations): ArrayUnidirectionalTranslations {
  return translations.map(x => [x[0], x[1][0]]);
}

function _extractY(translations: ArrayTranslations): ArrayUnidirectionalTranslations {
  return translations.map(x => [x[0], x[1][1]]);
}

function _mapToArrayUnidirectionalTranslations(map: Map<number, number>) {
  const mergedOutput: ArrayUnidirectionalTranslations = [];

  map.forEach((translation, frame) => {
    mergedOutput.push([frame, translation]);
  });

  return mergedOutput;
}