export const cmuPhonemesMap: Map<string, string[]> = new Map<string, string[]>([
  // consonants
  ['B', ['mbsilent']],
  ['CH', ['stch']],
  ['D', ['ld']],
  ['DH', ['ld']], // WEIRD!
  ['F', ['fv']],
  ['G', ['stch']],
  ['HH', ['aah']], // WEIRD!
  ['JH', ['stch']],
  ['K', ['stch']],
  ['L', ['ld']],
  ['M', ['mbsilent']],
  ['N', ['stch']],
  ['NG', ['stch']],
  ['P', ['p1', 'p2']],
  ['R', ['ur']],
  ['S', ['stch']],
  ['SH', ['stch']],
  ['T', ['stch']],
  ['TH', ['stch']],
  ['V', ['fv']],
  ['W', ['ur']],
  ['Z', ['stch']],
  ['ZH', ['stch']],

  // vowels
  ['AA', ['o']],
  ['AE', ['e']],
  ['AH', ['aah']],
  ['AO', ['o']],
  ['AW', ['aah']],
  ['AY', ['aah']],
  ['EH', ['e']],
  ['ER', ['ur']],
  ['EY', ['e']],
  ['IH', ['e']],
  ['IY', ['e']],
  ['OW', ['o']],
  ['OY', ['o']],
  ['UH', ['ur']],
  ['UW', ['ur']],
  ['Y', ['e']],

  // punctuation
  [',', ['pause']],
  ['.', ['pause', 'smile']],
]);