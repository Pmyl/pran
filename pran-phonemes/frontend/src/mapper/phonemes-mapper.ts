const phonemes: Map<string, (keyof MouthMapping)[]> = new Map<string, (keyof MouthMapping)[]>([
  // consonants
  ['b', ['mbsilent']],
  ['d', ['ld']],
  ['f', ['fv']],
  ['g', ['stch']],
  ['h', ['ur']],
  ['dʒ', ['stch']],
  ['k', ['stch']],
  ['l', ['ld']],
  ['m', ['mbsilent']],
  ['n', ['mbsilent']],
  ['p', ['p1', 'p2']],
  ['r', ['ur']],
  ['s', ['stch']],
  ['t', ['stch']],
  ['v', ['fv']],
  ['w', ['ur']],
  ['z', ['stch']],
  ['ʒ', ['stch']],
  ['tʃ', ['stch']],
  ['ʃ', ['stch']],
  ['θ', ['stch']],
  ['ð', ['stch']],
  ['ŋ', ['mbsilent']],
  ['j', ['stch']],

  // vowels
  ['æ', ['aah']],
  ['eɪ', ['e']],
  ['e', ['e']],
  ['i:', ['e']],
  ['ɪ', ['e']],
  ['aɪ', ['aah']],
  ['ɒ', ['aah']],
  ['oʊ', ['o']],
  ['ʊ', ['ur']],
  ['ʌ', ['aah']],
  ['u:', ['ur']],
  ['ɔɪ', ['o']],
  ['aʊ', ['aah']],
  ['ə', ['aah']],
  ['eəʳ', ['aah']],
  ['ɑ:', ['aah']],
  ['ɜ:ʳ', ['ur']],
  ['ɔ:', ['aah']],
  ['ɪəʳ', ['e']],
  ['ʊəʳ', ['ur']],

  // punctuation
  [',', ['pause']],
  ['.', ['pause', 'smile']],
]);

export interface MouthMapping<T = string> {
  fv: T;
  ur: T;
  stch: T;
  mbsilent: T;
  p1: T;
  p2: T;
  e: T;
  aah: T;
  o: T;
  ld: T;
  pause: T;
  smile: T;
}

export function phonemesMapper<TOutput = string>(inputPhonemes: string[], mouthMapping: MouthMapping<TOutput>, phonemesOverride?: Map<string, (keyof MouthMapping)[]>): TOutput[] {
  phonemesOverride = phonemesOverride || phonemes;

  return inputPhonemes.flatMap(p => {
    if (!phonemesOverride.has(p)) {
      throw new Error();
    }

    return phonemesOverride.get(p);
  }).map(m => mouthMapping[m]);
}
