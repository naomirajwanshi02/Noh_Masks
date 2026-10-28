// The eight masks. Words are written for readers aged 8–14: one short line for
// who the mask is and one true fact. `theatre` says whether the mask comes from Noh
// or from Kyogen, the comic plays performed alongside it. Every claim is sourced in SOURCES.md.

export const MASKS = [
  {
    id: 'kojo', theatre: 'Noh', name: 'Kojo', alt: 'Gojo', jp: '小尉', kana: 'こじょう', role: 'Mask of an old man',
    blurb: 'A calm old man. In the play “Takasago” he sweeps fallen pine needles, and turns out to be the spirit of a pine tree!',
    fact: 'Kojo’s hair and beard are real horsehair, set into the wood of the mask.',
  },
  {
    id: 'chujo', theatre: 'Noh', name: 'Chujo', jp: '中将', kana: 'ちゅうじょう', role: 'Mask of a noble man',
    blurb: 'A noble from the old imperial court, said to be modelled on the poet Ariwara no Narihira.',
    fact: 'His high painted eyebrows and blackened teeth show he is a high-ranking noble, and the lines on his forehead show sadness.',
  },
  {
    id: 'koomote', theatre: 'Noh', name: 'Ko-omote', jp: '小面', kana: 'こおもて', role: 'Mask of a young woman',
    blurb: 'A young girl. Her hair is parted in the middle, with three thin strands on each side.',
    fact: 'Noh actors tilt a mask up to make it look happy (“terasu”, to shine) and down to make it look sad (“kumorasu”, to cloud).',
  },
  {
    id: 'hannya', theatre: 'Noh', name: 'Hannya', jp: '般若', kana: 'はんにゃ', role: 'Mask of a female demon',
    blurb: 'A woman who became a horned demon because of jealousy. A red Hannya is used in the play “Dōjōji”.',
    fact: 'Looking straight ahead Hannya seems furious, but tilted slightly down she looks as if she is crying.',
  },
  {
    id: 'buaku', theatre: 'Kyogen', name: 'Buaku', jp: '武悪', kana: 'ぶあく', role: 'Mask of a demon',
    blurb: 'A demon from Kyogen, the funny plays performed with Noh. He looks fierce, but a little timid too.',
    fact: 'Buaku plays the demon in “Setsubun”, where the demon is driven away with roasted beans, just like at Setsubun in February.',
  },
  {
    id: 'usofuki', theatre: 'Kyogen', name: 'Uso-fuki', jp: '嘯吹', kana: 'うそふき', role: 'Comical pouting mask',
    blurb: 'A silly Kyogen face with pursed lips, puffing as hard as he can.',
    fact: 'Uso-fuki plays all kinds of little spirits: a mosquito in “Kazumō”, mushrooms in “Kusabira”, even ants and cicadas.',
  },
  {
    id: 'saru', theatre: 'Kyogen', name: 'Saru', jp: '猿', kana: 'さる', role: 'Mask of a monkey',
    blurb: 'A cheeky red-faced monkey, like the one in the Kyogen play “Utsubozaru”.',
    fact: 'Children from Kyogen families often make their first stage appearance at about age 4, playing the little monkey.',
  },
  {
    id: 'kitsune', theatre: 'Kyogen', name: 'Kitsune', jp: '狐', kana: 'きつね', role: 'Mask of a fox',
    blurb: 'A clever fox spirit. In the Kyogen play “Tsurigitsune” an old fox disguises himself as a priest!',
    fact: 'Foxes are the messengers of Inari, the god of rice, and in old stories they light ghostly “fox-fire” (kitsunebi).',
  },
];

export const BY_ID = Object.fromEntries(MASKS.map((m, i) => [m.id, { ...m, n: i + 1 }]));
