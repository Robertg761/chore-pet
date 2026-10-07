import { catalogEntry } from '../catalog/objects'
import type { MessKind } from '../catalog/types'
import type { Mood } from '../domain/types'

// The pet's voice. Short, warm, a little silly; never guilt, blame, or drama.
// Species-neutral: every line works for Mochi, Bun and Sprout.
//
// `{chore}` is an optional placeholder for the chore's name, lowercased (for
// example "wash the dishes"). Default chore names are verb phrases, so lines
// that use it read as "to {chore}", "we {chore}" or "{chore}?" (a line that
// starts with it gets a capital). Pick lines with `pickLine`, which is
// deterministic by seed.

/** How the pet feels right now, by mood. */
export const MOOD_LINES: Record<Mood, string[]> = {
  happy: [
    'Everything feels sparkly today!',
    'I could bounce all the way to the moon.',
    'This home is the best home.',
    'I feel like doing a happy wiggle!',
    'Tidy rooms, happy me. Yay!',
  ],
  content: [
    'Mmm, cosy. This is nice.',
    'I found the warmest spot in the room.',
    'A calm day. I like those.',
    'Life is good. Snack later, maybe?',
    'Just humming and enjoying the view.',
  ],
  meh: [
    'Feeling a little flat today. Still okay!',
    'A tiny tidy would perk me right up.',
    "I'm just sort of... hanging out.",
    'Hmm, things could be a bit fresher.',
    'Not bad, not sparkly. Somewhere in between.',
  ],
  scruffy: [
    'I feel a bit scruffy today.',
    'A little sparkle would cheer me right up.',
    'A bit of tidying would feel lovely.',
    "I'm a little grubby, but hopeful!",
    'Dreaming of clean floors and sunshine.',
  ],
  sick: [
    "I'm a bit wobbly, but I'll be fine.",
    'Resting in bed. A little help is lovely.',
    'Tiny nap first, then sparkle.',
    "Everything feels sleepy. I'm okay!",
    'One chore at a time. I believe in us.',
  ],
}

/** Shown when this object's chore is the most overdue. Keyed by catalog id. */
export const OBJECT_LINES: Record<string, string[]> = {
  bed: [
    'The bed looks a little rumpled.',
    'Fresh sheets would be a dream.',
    "I'm eyeing those cosy blankets.",
  ],
  couch: [
    'The couch cushions are asking for a fluff.',
    'The cushions look a bit flat.',
    'I think the couch wants a good fluff.',
  ],
  dishwasher: [
    'The dishwasher is holding its breath.',
    'Clean dishes are waiting to come out!',
    'The dishwasher keeps humming at me.',
  ],
  'fish-tank': [
    'The fish keep waving at me. Snack time?',
    'The fish tank is getting a little cloudy.',
    'The fish would love a sparkly tank.',
  ],
  fridge: [
    'The fridge has some mystery containers.',
    'Something in the fridge wants a goodbye.',
    'I peeked in the fridge. What an adventure.',
  ],
  plant: [
    'The plant looks a little thirsty.',
    'The leaves are drooping for a drink.',
    'I think the plant wants some water.',
  ],
  recycling: [
    'The recycling is stacking up high.',
    'The bottles are clinking for attention.',
    'Recycling is ready for an outing.',
  ],
  rug: [
    'The rug is wishing for a vacuum.',
    "There's crumb confetti on the rug.",
    'I spy fluff on the rug.',
  ],
  shower: [
    'The shower would love a scrub.',
    'The shower is dreaming of sparkle.',
    "I'd love a super shiny shower.",
  ],
  sink: [
    'The sink is piling up a little.',
    'I think the dishes are plotting something.',
    'The dishes are building a very tall tower.',
  ],
  stove: [
    'The stove is wearing a tiny crumb coat.',
    'The stove looks a bit speckly.',
    'A shiny stove would make me so happy.',
  ],
  table: [
    'The table has a few crumbs on it.',
    'The table wants a quick wipe.',
    'Crumbs are having a party on the table.',
  ],
  toilet: [
    'The toilet would love a little shine.',
    'The bathroom could use some sparkle.',
    'A fresh toilet would be so nice.',
  ],
  trash: [
    'The trash can is full to the brim!',
    'The trash can is doing its very best.',
    'The trash can lid is starting to wobble.',
  ],
  washer: [
    'The laundry pile is getting fluffy.',
    'The washer is ready when you are.',
    'The socks are forming a small mountain.',
  ],
}

/**
 * Overdue chores that are not tied to an object. Every line uses {chore} and
 * reads after a verb phrase ("wash the dishes").
 */
export const CHORE_LINES: string[] = [
  'Could we {chore} soon?',
  'It would be wonderful to {chore}.',
  'Ready to {chore} when you are!',
  'How about we {chore} next?',
  'Shall we {chore} together?',
  "I'd cheer if we could {chore}!",
]

/** Delighted reactions to being tapped. */
export const TAP_LINES: string[] = [
  'Hi!',
  'Hehe, that tickles.',
  'Oh! Hello!',
  'I love pats!',
  'Boop! Right back at you.',
  'Again, again!',
  "You're my favourite.",
  'Wheee!',
]

/** Celebrations when a chore gets done. Lines starting with {chore} are capitalised. */
export const DONE_LINES: string[] = [
  'Sparkly!',
  '{chore}: done! Hooray!',
  'Yay, that feels so good!',
  'Look at that shine!',
  'We did it! High five!',
  'Ahh, so fresh. Thank you!',
  '{chore}? Done and dusted!',
  'Happy wiggle time!',
  'Nice one! I felt that sparkle.',
  'Another one ticked off. Lovely!',
  'You make this look easy!',
  'Hooray! Now we can relax.',
  "That's a job well done!",
  'Ooh, so tidy! Thank you!',
  'Team us! Great work.',
  'Cosy and clean. I love it!',
  'Thank you, thank you, thank you!',
]

/** Done lines for clearing a chore that had piled up (neglect level 3). */
export const BIG_DONE_LINES: string[] = [
  'Phew! That was a big one.',
  'Big sparkle! That took real heart.',
  'Wow, what a difference. Thank you!',
  'That was a big one. We did it!',
]

/** Done lines for the first chore finished today. */
export const FIRST_OF_DAY_LINES: string[] = [
  'Good morning, tidy friend!',
  'Off to a sparkly start!',
  'First one of the day. Lovely!',
]

/** Relaxed lines while the home is on vacation. */
export const VACATION_LINES: string[] = [
  'Chores are paused. Time to relax!',
  'Vacation mode: naps and snacks.',
  "Enjoy your break. I'll be right here.",
  'Nothing to do but lounge around.',
]

/** The very first moment in a new home. */
export const WELCOME_LINES: string[] = [
  "Let's make this place ours!",
  'A blank home! Where shall we start?',
  "Hello, home! Let's build something cosy.",
  'Pick a spot and add something fun!',
]

/** When the player opens the app after some days away. Never about what was missed. */
export const WELCOME_BACK_LINES: string[] = [
  "You're back! I kept your spot warm.",
  'Welcome home! One thing at a time.',
  'Hello again! I missed your pats.',
]

/** When nothing is late anywhere. */
export const CAUGHT_UP_LINES: string[] = [
  'All caught up! Happy dance time!',
  'Nothing late anywhere. Look at us!',
  'Sparkly from corner to corner!',
]

/**
 * What the pet says about a smelly, dusty or wilting object, by mess kind and
 * neglect level (2 = starting to show, 3 = piling up). Level 0 and 1 are quiet.
 */
export const KIND_LINES: Record<MessKind, Record<2 | 3, string[]>> = {
  stink: {
    2: [
      'Sniff sniff. Something is getting whiffy.',
      'A fly just did a lap of the room. Show-off.',
      'I smell an adventure. A smelly one.',
    ],
    3: [
      'The flies have started a little club over there.',
      'That stink cloud waved at me. I waved back.',
      'Phew! Even the flies are holding their noses.',
    ],
  },
  dust: {
    2: ['Achoo! A bit dusty over there.', 'I drew a smiley face in the dust.', 'The dust bunnies are having a picnic.'],
    3: [
      "A spider asked to move in. I said I'd check with you.",
      'The cobwebs are getting very fancy.',
      'I found a dust bunny the size of me!',
    ],
  },
  wilt: {
    2: ['The plant is drooping a little. Thirsty, maybe?', 'I heard a tiny leaf sigh.'],
    3: ["The plant dropped a leaf. I think it's a hint.", 'A big drink would perk the plant right up.'],
  },
}

/**
 * Lines about one specific chore of an object, keyed `catalogId:choreIndex`
 * (the index in the catalog entry's `chores`). Anything not listed falls back
 * to the object's OBJECT_LINES.
 */
export const CHORE_OBJECT_LINES: Record<string, string[]> = {
  'bed:0': ['The bed looks a little rumpled.', 'The blankets want a quick tidy.'],
  'bed:1': ['Fresh sheets would be a dream.'],
  'fish-tank:0': ['The fish keep waving at me. Snack time?'],
  'fish-tank:1': ['The fish tank is getting a little cloudy.'],
  'washer:1': ['The washer would love a spa day.'],
}

const CHORE_PLACEHOLDER = '{chore}'

/**
 * Deterministic pick: the same lines and seed always give the same line, so the
 * UI can vary what the pet says without randomness during render.
 *
 * - Any number works as a seed (negatives, fractions, huge values); NaN and
 *   infinities fall back to 0.
 * - `{chore}` is filled with the lowercased chore name. If a line needs it and
 *   no chore is given, that line is skipped.
 * - A line that starts with the chore name gets a capital letter.
 * - Returns '' if there is no usable line.
 */
export function pickLine(lines: string[], seed: number, vars: { chore?: string } = {}): string {
  // Only the first letter drops to lower case, so a player's "Feed Mochi" reads "feed Mochi" mid-line
  // (and an acronym like "TV dusting" stays as it is).
  const raw = vars.chore?.trim()
  const chore = raw && raw.length > 1 && raw[1] === raw[1].toLowerCase() ? raw[0].toLowerCase() + raw.slice(1) : raw
  const usable = chore ? lines : lines.filter((line) => !line.includes(CHORE_PLACEHOLDER))
  if (usable.length === 0) return ''

  const whole = Number.isFinite(seed) ? Math.floor(seed) : 0
  const index = ((whole % usable.length) + usable.length) % usable.length
  const line = usable[index]
  if (!chore) return line

  const filled = line.split(CHORE_PLACEHOLDER).join(chore)
  return line.startsWith(CHORE_PLACEHOLDER) ? filled.charAt(0).toUpperCase() + filled.slice(1) : filled
}

/**
 * The pet's line about one object's chore. Finds the chore's index in the
 * catalog entry (by name, ignoring case) and uses its CHORE_OBJECT_LINES; if
 * there are none, or the chore was renamed or added by the player, it falls
 * back to the object's OBJECT_LINES. Returns '' for an unknown object.
 */
export function objectLine(catalogId: string, choreName: string, beat: number): string {
  const wanted = choreName.trim().toLowerCase()
  const index = catalogEntry(catalogId)?.chores.findIndex((c) => c.name.toLowerCase() === wanted) ?? -1
  const specific = index >= 0 ? CHORE_OBJECT_LINES[`${catalogId}:${index}`] : undefined
  return pickLine(specific ?? OBJECT_LINES[catalogId] ?? [], beat)
}

/**
 * The pet's line about a messy object. Only neglect levels 2 and 3 have lines
 * (higher counts as 3); anything lower gives ''.
 */
export function messLine(kind: MessKind, level: number, beat: number, vars: { chore?: string } = {}): string {
  if (!Number.isFinite(level) || level < 2) return ''
  return pickLine(KIND_LINES[kind][level >= 3 ? 3 : 2], beat, vars)
}
