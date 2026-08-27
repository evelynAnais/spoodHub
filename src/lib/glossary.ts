/**
 * The shared anatomy and life-cycle glossary.
 *
 * Two things read this file:
 *   - `components/Glossary.astro`, which renders the definitions
 *   - `lib/rehype-glossary.ts`, which auto-links the first mention of each term
 *     in every Markdown guide
 *
 * So adding a term here makes it both documented and linked everywhere, with
 * no per-guide effort.
 */

export interface GlossaryTerm {
  term: string;
  /** Shown in parentheses after the term — synonyms or singular/plural. */
  also?: string;
  text: string;
  /**
   * Extra spellings and inflections that should link to this entry. The `term`
   * itself is always matched and does not need repeating here.
   */
  aliases?: string[];
}

export interface GlossaryGroup {
  heading: string;
  terms: GlossaryTerm[];
}

export const GLOSSARY_GROUPS: GlossaryGroup[] = [
  {
    heading: 'Body parts',
    terms: [
      {
        term: 'Cephalothorax',
        also: 'prosoma',
        aliases: ['prosoma'],
        text: 'The front section, combining what would be the head and the chest. Everything attaches here — all eight legs, all eight eyes, the chelicerae and the pedipalps.',
      },
      {
        term: 'Abdomen',
        also: 'opisthosoma',
        aliases: ['opisthosoma'],
        text: 'The rear section. Soft, unsegmented, and where the spinnerets and book lungs are. Its size is the best quick read on how well fed a spider is.',
      },
      {
        term: 'Chelicerae',
        also: 'singular: chelicera',
        aliases: ['chelicera'],
        text: 'The pair of jaw-like appendages at the front of the face, each ending in a fang. This is the part that looks like a moustache or a pair of tusks. In many jumping spiders they are strikingly iridescent — green, blue or violet — and in some species their color and texture differ between males and females.',
      },
      {
        term: 'Pedipalps',
        also: 'palps',
        aliases: ['pedipalp', 'palps'],
        text: 'The short pair of appendages either side of the chelicerae, held in front like a pair of small arms. They are mouthparts, not legs — a spider still has only eight legs. Used for handling food and sensing. In a mature male the tips are swollen into the palpal bulb.',
      },
      {
        term: 'Palpal bulb',
        aliases: ['palpal bulbs'],
        text: 'The rounded, polished knob at the tip of each pedipalp in a mature male — his copulatory organ. Often described as looking like boxing gloves. Only fully formed after the final molt, and the single most reliable way to identify a male.',
      },
      {
        term: 'Epigyne',
        text: 'The hardened external genital plate on the underside of a mature female’s abdomen, sitting between the book lungs. The female counterpart to the palpal bulb for identification purposes.',
      },
      {
        term: 'Book lungs',
        aliases: ['book lung'],
        text: 'How a spider breathes. Each one is a stack of thin flat plates of tissue with air spaces between them — arranged like the pages of a book, which is exactly where the name comes from. They appear as two paler patches on the underside of the abdomen, toward the front.',
      },
      {
        term: 'Spinnerets',
        aliases: ['spinneret'],
        text: 'The small finger-like projections at the rear tip of the abdomen that silk comes out of. Jumping spiders use silk for draglines, resting retreats and egg sacs — never for a prey-catching web.',
      },
      {
        term: 'Setae',
        also: 'singular: seta',
        aliases: ['seta'],
        text: 'Bristles. Spiders have no hair, so what looks like fur is a coat of stiff cuticular bristles. Many are sensory, picking up touch, vibration and air movement. Dense patches are called tufts, and their placement is sometimes a clue to species or sex.',
      },
      {
        term: 'Haemolymph',
        aliases: ['hemolymph'],
        text: 'Spider blood. It also works as hydraulic fluid — jumping spiders extend their legs by pumping it under pressure rather than by muscle alone, which is how a small spider jumps so far.',
      },
      {
        term: 'Dragline',
        aliases: ['draglines'],
        text: 'A safety line of silk anchored before a jump or a climb. If a jumping spider falls or misjudges, the dragline catches it — which is why one that leaps off your hand usually ends up dangling rather than hitting the floor.',
      },
    ],
  },
  {
    heading: 'Growing up',
    terms: [
      {
        term: 'Instar',
        aliases: ['instars'],
        text: 'One stage between molts. A newly emerged spiderling is at first instar; after its first molt it is at second instar, and so on. Instar is a better measure of development than age, because growth rate depends heavily on temperature and feeding.',
      },
      {
        term: 'Molt',
        also: 'British: moult',
        // British spellings stay as aliases so a contributor writing "moult"
        // still gets the link, even though the site's own prose uses "molt".
        aliases: ['molts', 'molting', 'moult', 'moults', 'moulting'],
        text: 'Shedding the old exoskeleton to grow. A spider cannot grow gradually, so it grows in steps. Also the most dangerous routine event in its life — see the molting guide.',
      },
      {
        term: 'Exuvia',
        also: 'plural: exuviae',
        aliases: ['exuviae'],
        text: 'The shed exoskeleton left behind after a molt. A complete, hollow copy of the spider, right down to the fangs. Harmless, and genuinely useful — you can examine it under magnification for as long as you like without disturbing the spider.',
      },
      {
        term: 'Pre-molt',
        aliases: ['premolt', 'pre-moult', 'premoult'],
        text: 'The period before a molt when a spider stops eating, thickens its retreat and seals itself in. Recognizing it is the point of the tracker’s estimate.',
      },
      {
        term: 'Subadult',
        also: 'penultimate instar',
        aliases: ['penultimate instar', 'penultimate molt', 'penultimate moult'],
        text: 'The stage immediately before adulthood — after the second-to-last molt, before the final one. In males the pedipalp tips are visibly swollen but not yet hardened into a finished bulb.',
      },
      {
        term: 'Senescence',
        also: 'ageing',
        aliases: ['senescent', 'senescing'],
        text: 'Biological ageing — the gradual decline in function that comes with old age rather than with illness or injury. In a jumping spider it tends to show as poorer jumping, less interest in hunting, and colours that dull without a molt to restore them. It is not a disease and there is nothing to treat; it is the end of a fairly short life.',
      },
      {
        term: 'Gravid',
        text: 'Carrying eggs. Usually shows as a steadily enlarging abdomen that keeps growing rather than shrinking between meals.',
      },
      {
        term: 'Spermathecae',
        aliases: ['spermatheca'],
        text: 'Internal receptacles where a female stores sperm after mating, sometimes for months. Why a wild-caught female can produce fertile eggs long after arriving in your care, with no male present.',
      },
    ],
  },
];

export const GLOSSARY_TERMS: GlossaryTerm[] = GLOSSARY_GROUPS.flatMap((g) => g.terms);

/** Stable anchor id for a term, shared by the renderer and the auto-linker. */
export function glossaryAnchor(term: string): string {
  return `glossary-${term.toLowerCase().replace(/[^a-z]+/g, '-')}`;
}

/**
 * Every phrase that should link to the glossary, paired with its anchor and
 * sorted longest-first so that "penultimate molt" wins over "molt" and
 * "book lungs" is never matched as just "lungs".
 */
export function glossaryPhrases(): { phrase: string; anchor: string }[] {
  return GLOSSARY_TERMS.flatMap((entry) => {
    const anchor = glossaryAnchor(entry.term);
    return [entry.term, ...(entry.aliases ?? [])].map((phrase) => ({ phrase, anchor }));
  }).sort((a, b) => b.phrase.length - a.phrase.length);
}
