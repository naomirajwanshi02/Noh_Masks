// The eight masks. Words are written for readers aged 8–14: one short line for
// who the mask is, one true fact, and what happens when you open your mouth.

export const MASKS = [
  {
    id: 'kojo', name: 'Kojo', alt: 'Gojo', jp: '小尉', kana: 'こじょう', role: 'Mask of an old man',
    blurb: 'A gentle old man. In many plays he is really a god in disguise!',
    fact: 'Kojo has a real beard made of hair, glued into tiny holes in the wood.',
    effect: 'ginkgo', effectName: 'golden ginkgo leaves',
  },
  {
    id: 'chujo', name: 'Chujo', jp: '中将', kana: 'ちゅうじょう', role: 'Mask of a noble man',
    blurb: 'A noble poet-warrior from the old imperial court, a little sad and very elegant.',
    fact: 'His teeth are painted black. Long ago, nobles in Japan blackened their teeth to look fancy.',
    effect: 'momiji', effectName: 'red maple leaves',
  },
  {
    id: 'koomote', name: 'Ko-omote', jp: '小面', kana: 'こおもて', role: 'Mask of a young woman',
    blurb: 'A young woman with a soft, calm smile. Tilt your head and her mood changes!',
    fact: 'Noh actors tilt a mask up to make it smile and down to make it look sad.',
    effect: 'sakura', effectName: 'cherry blossom petals',
  },
  {
    id: 'hannya', name: 'Hannya', jp: '般若', kana: 'はんにゃ', role: 'Mask of a female demon',
    blurb: 'A woman so jealous and angry that she turned into a horned demon.',
    fact: 'From the front Hannya looks furious, but tip it down and she looks like she is crying.',
    effect: 'fire', effectName: 'demon fire',
  },
  {
    id: 'buaku', name: 'Buaku', jp: '武悪', kana: 'ぶあく', role: 'Mask of a demon',
    blurb: 'A grumpy demon from Kyogen, the funny plays performed between Noh plays.',
    fact: 'Buaku looks scary, but in Kyogen comedies the demon is usually tricked and chased away.',
    effect: 'steam', effectName: 'angry steam',
  },
  {
    id: 'usofuki', name: 'Uso-fuki', jp: '嘘吹', kana: 'うそふき', role: 'Comical pouting mask',
    blurb: 'A silly face with pursed lips, as if he is whistling or blowing on a fire.',
    fact: '“Uso-fuki” means “whistle-blower”. Kyogen actors use him for mosquitoes and other funny spirits.',
    effect: 'bubbles', effectName: 'whistle bubbles', pucker: true,
  },
  {
    id: 'saru', name: 'Saru', jp: '猿', kana: 'さる', role: 'Mask of a monkey',
    blurb: 'A cheeky red-faced monkey from the Kyogen play “Utsubozaru”.',
    fact: 'Young Kyogen actors often play the monkey in their very first show, some at just 3 or 4 years old!',
    effect: 'persimmon', effectName: 'falling persimmons',
  },
  {
    id: 'kitsune', name: 'Kitsune', jp: '狐', kana: 'きつね', role: 'Mask of a fox',
    blurb: 'A clever fox spirit. In Japanese stories foxes can change into people!',
    fact: 'Foxes are messengers of Inari, the rice god, and you can see their statues at Inari shrines.',
    effect: 'foxfire', effectName: 'blue fox-fire',
  },
];

export const BY_ID = Object.fromEntries(MASKS.map((m, i) => [m.id, { ...m, n: i + 1 }]));
