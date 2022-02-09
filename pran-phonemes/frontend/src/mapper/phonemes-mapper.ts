import { testPhonemesMap } from './maps/test-phonemes-map';

export interface MapOutput {
  phoneme: string;
  output: string;
}

export function phonemesMapper(inputPhonemes: string[], phonemesOverride?: Map<string, string[]>): MapOutput[] {
  phonemesOverride = phonemesOverride || testPhonemesMap;

  return inputPhonemes.flatMap(phoneme => {
    if (!phonemesOverride.has(phoneme)) {
      console.warn('Phoneme', phoneme, 'has no match, returning no mouth positions.');
      return [];
    }

    const ids: string[] = phonemesOverride.get(phoneme);

    return ids.map(id => ({ phoneme, output: id }));
  });
}
