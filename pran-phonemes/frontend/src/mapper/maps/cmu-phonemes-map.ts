export const cmuPhonemesMap: Map<string, string[]> = new Map<string, string[]>([
  // consonants
  ['B', ['b']],
  ['CH', ['s']],
  ['D', ['l']],
  ['DH', ['l']], // WEIRD!
  ['F', ['fv']],
  ['G', ['s']],
  ['HH', ['ah']], // WEIRD!
  ['JH', ['s']],
  ['K', ['k']],
  ['L', ['l']],
  ['M', ['b']],
  ['N', ['s']],
  ['NG', ['s']],
  ['P', ['p1', 'p2']],
  ['R', ['ur']],
  ['S', ['s']],
  ['SH', ['s']],
  ['T', ['s']],
  ['TH', ['s']],
  ['V', ['fv']],
  ['W', ['ur']],
  ['Z', ['s']],
  ['ZH', ['s']],

  // vowels
  ['AA', ['oh']],
  ['AE', ['ee']],
  ['AH', ['ah']],
  ['AO', ['oh']],
  ['AW', ['ah']],
  ['AY', ['ah']],
  ['EH', ['ee']],
  ['ER', ['ur']],
  ['EY', ['ee']],
  ['IH', ['ee']],
  ['IY', ['ee']],
  ['OW', ['oh']],
  ['OY', ['oh']],
  ['UH', ['ur']],
  ['UW', ['ur']],
  ['Y', ['ee']],

  // punctuation
  [',', ['idle']],
  ['.', ['idle', 'idle']],
]);