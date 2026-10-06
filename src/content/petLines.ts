import type { Mood } from '../domain/types'

// The pet's voice. Short, warm, a little silly; never guilt, blame, or drama.
// Species-neutral: every line works for Mochi, Bun and Sprout.
//
// `{chore}` is an optional placeholder for the chore's name in lowercase (for
// example "wash the dishes"), so lines that use it should read well after a
// verb phrase. Pick lines with `pickLine`, which is deterministic by seed.

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
    'I am just sort of... hanging out.',
    'Hmm, things could be a bit fresher.',
    'Not bad, not sparkly. Somewhere in between.',
  ],
  scruffy: [
    'My fur feels a bit scruffy today.',
    'I miss the shiny days a little.',
    'A bit of tidying would feel lovely.',
    'I am a little grubby, but hopeful!',
    'Dreaming of clean floors and sunshine.',
  ],
  sick: [
    'I am a bit wobbly, but I will be fine.',
    'Resting in bed. A little help is lovely.',
    'Tiny nap first, then sparkle.',
    'Everything feels sleepy. I am okay!',
    'One chore at a time. I believe in us.',
  ],
}

/** Shown when this object's chore is the most overdue. Keyed by catalog id. */
export const OBJECT_LINES: Record<string, string[]> = {
  bed: [
    'The bed looks a little rumpled.',
    'Fresh sheets would be a dream.',
    'I am eyeing those cosy blankets.',
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
  fridge: [
    'The fridge has some mystery containers.',
    'Something in the fridge wants a goodbye.',
    'I peeked in the fridge. What an adventure.',
  ],
  recycling: [
    'The recycling is stacking up high.',
    'The bottles are clinking for attention.',
    'Recycling is ready for an outing.',
  ],
  rug: [
    'The rug is wishing for a vacuum.',
    'There is crumb confetti on the rug.',
    'I spy fluff on the rug.',
  ],
  shower: [
    'The shower would love a scrub.',
    'The shower is dreaming of sparkle.',
    'I would love a super shiny shower.',
  ],
  sink: [
    'The sink is getting to me.',
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
    'The bin is full to the brim!',
    'The trash can is doing its very best.',
    'The bin lid is starting to wobble.',
  ],
  washer: [
    'The laundry pile is getting fluffy.',
    'The washer is ready when you are.',
    'The socks are forming a small mountain.',
  ],
}

/** Overdue chores that are not tied to an object. Every line uses {chore}. */
export const CHORE_LINES: string[] = [
  'Could we {chore} soon?',
  'A little {chore} would be wonderful.',
  'Ready to {chore} when you are!',
  'Dreaming of the day we {chore}.',
  'Shall we {chore} together?',
  'I would cheer if we could {chore}!',
]

/** Delighted reactions to being tapped. */
export const TAP_LINES: string[] = [
  'Hi!',
  'Hehe, that tickles.',
  'Oh! Hello!',
  'I love pats!',
  'Boop! Right back at you.',
  'Again, again!',
  'You are my favourite.',
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
  'Wow, {chore} is done!',
  'Happy wiggle time!',
]

/** Relaxed lines while the home is on vacation. */
export const VACATION_LINES: string[] = [
  'Chores are paused. Time to relax!',
  'Holiday mode: naps and snacks.',
  'Enjoy your break. I will be right here.',
  'Nothing to do but lounge around.',
]

/** The very first moment in a new home. */
export const WELCOME_LINES: string[] = [
  "Let's make this place ours!",
  'A blank home! Where shall we start?',
  'Hello, home! Let us build something cosy.',
  'Pick a spot and add something fun!',
]

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
  const chore = vars.chore?.trim().toLowerCase()
  const usable = chore ? lines : lines.filter((line) => !line.includes(CHORE_PLACEHOLDER))
  if (usable.length === 0) return ''

  const whole = Number.isFinite(seed) ? Math.floor(seed) : 0
  const index = ((whole % usable.length) + usable.length) % usable.length
  const line = usable[index]
  if (!chore) return line

  const filled = line.split(CHORE_PLACEHOLDER).join(chore)
  return line.startsWith(CHORE_PLACEHOLDER) ? filled.charAt(0).toUpperCase() + filled.slice(1) : filled
}
