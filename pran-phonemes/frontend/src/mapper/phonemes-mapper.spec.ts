import { MouthMapping, phonemesMapper } from './phonemes-mapper';

describe('phonemes-mapper', () => {
  function runMapper(input: string[]): string[] {
    return phonemesMapper(input, {
      fv: 'url/to/fv.png',
      ur: 'url/to/ur.png',
      stch: 'url/to/stch.png',
      mbsilent: 'url/to/mbsilent.png',
      p1: 'url/to/p1.png',
      p2: 'url/to/p2.png',
      e: 'url/to/e.png',
      aah: 'url/to/aah.png',
      o: 'url/to/o.png',
      ld: 'url/to/ld.png',
      pause: 'url/to/pause.png',
      smile: 'url/to/smile.png',
    });
  }

  function runMapperWithPhonemeMap(input: string[], phonemeMap: Map<string, (keyof MouthMapping)[]>): string[] {
    return phonemesMapper(input, {
      fv: 'url/to/fv.png',
      ur: 'url/to/ur.png',
      stch: 'url/to/stch.png',
      mbsilent: 'url/to/mbsilent.png',
      p1: 'url/to/p1.png',
      p2: 'url/to/p2.png',
      e: 'url/to/e.png',
      aah: 'url/to/aah.png',
      o: 'url/to/o.png',
      ld: 'url/to/ld.png',
      pause: 'url/to/pause.png',
      smile: 'url/to/smile.png',
    }, phonemeMap);
  }

  it('should return empty array when provided no inputs', () => {
    expect(runMapper([])).toEqual([]);
  });

  it('should throw an error when provided with non-phonemes', () => {
    const notRealPhonemes: string[] = ['q', 'i'];

    for (let i = 0; i < notRealPhonemes.length; i++) {
      expect(() => runMapper([notRealPhonemes[i]])).toThrow();
    }
  });

  it('should not throw an error when provided with english single letter phonemes', () => {
    const singleLetterPhonemes: string[] = [
      'b', 'd', 'f', 'g', 'h', 'd', 'l', 'm', 'n', 'p', 'r',
      's', 't', 'v', 'w', 'z', 'ʒ', 'ʃ', 'θ', 'ð', 'ŋ', 'j',
      'æ', 'e', 'ɪ', 'ɒ', 'ʊ', 'ʌ', 'ə'
    ];

    for (let i = 0; i < singleLetterPhonemes.length; i++) {
      expect(() => runMapper([singleLetterPhonemes[i]])).not.toThrow();
    }
  });

  it('should not throw an error when provided with english double letter phonemes', () => {
    const doubleLetterPhonemes: string[] = ['dʒ', 'tʃ', 'eɪ', 'aɪ', 'oʊ', 'u:', 'ɔɪ', 'aʊ', 'ɑ:', 'ɔ:'];

    for (let i = 0; i < doubleLetterPhonemes.length; i++) {
      expect(() => runMapper([doubleLetterPhonemes[i]])).not.toThrow();
    }
  });

  it('should not throw an error when provided with english triple letter phonemes that starts with a single letter phoneme', () => {
    const tripleLetterPhonemes: string[] = ['eəʳ', 'ʊəʳ', 'ɪəʳ'];

    for (let i = 0; i < tripleLetterPhonemes.length; i++) {
      expect(() => runMapper([tripleLetterPhonemes[i]])).not.toThrow();
    }
  });

  it('should not throw an error when provided with english triple letter phonemes', () => {
    const tripleLetterPhonemes: string[] = ['ɜ:ʳ'];

    for (let i = 0; i < tripleLetterPhonemes.length; i++) {
      expect(() => runMapper([tripleLetterPhonemes[i]])).not.toThrow();
    }
  });

  it('should return the correct mapping based on input', () => {
    expect(runMapperWithPhonemeMap(['v'], new Map<string, (keyof MouthMapping)[]>([['v', ['fv']]]))).toEqual(['url/to/fv.png']);
  });

  it('should return the correct mapping based on input when a phoneme is mapped to multiple mouth positions', () => {
    expect(runMapperWithPhonemeMap(['v'], new Map<string, (keyof MouthMapping)[]>([['v', ['fv', 'aah']]])))
      .toEqual(['url/to/fv.png', 'url/to/aah.png']);
  });

  it('should return the correct mapping based on input when a phoneme is mapped to multiple mouth positions and there are more phonemes', () => {
    expect(runMapperWithPhonemeMap(['v', 'e'], new Map<string, (keyof MouthMapping)[]>([['v', ['fv', 'aah']], ['e', ['ur', 'stch']]])))
      .toEqual(['url/to/fv.png', 'url/to/aah.png', 'url/to/ur.png', 'url/to/stch.png']);
  });
});