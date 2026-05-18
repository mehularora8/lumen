// Town entities. The shape is:
//
//   id           unique key (also used as inventory id when rewardItem === id)
//   type         'shop' | 'cafe' | 'house' | 'phonebooth' | 'fountain' | 'coin'
//                | 'park' | 'billboard' | 'corner' | 'npc'
//                | 'lamp' | 'tree' | 'planter' | 'bench'
//   x, y         top-left tile of the entity footprint
//   width        tiles wide  (default 1)
//   height       tiles tall  (default 1)
//   name         display name (shops, houses, npcs)
//   number       house number (only for type 'house')
//   chimney      house has a chimney (only some houses do)
//   poster       small wall poster string (e.g. 'MISSING')
//   doorSide     'north' | 'south' | 'east' | 'west' (which side of the building the door is on)
//   palette      optional color overrides
//   interaction  dialog logic — omit for purely decorative entities
//
// Decorative types (lamp, tree, planter, bench, corner, park, coin, fountain) are
// non-blocking — the player walks through/onto them.
//
// Interaction kinds (counts default to 1 when omitted):
//   { kind: 'note',   text }
//   { kind: 'pickup', text, rewardItem, rewardCount?, rewardText? }   // one-shot grant
//   { kind: 'code',   prompt, code, length?, text, lockedText?,
//                     requiresItem?, requiresCount?,
//                     rewardItem?, rewardCount?, rewardText? }
//   { kind: 'trade',  prompt, text, lockedText, rewardText,
//                     requiresItem, requiresCount?,
//                     rewardItem?, rewardCount?,
//                     repeatable?: true }
//   { kind: 'exit',   requiresItem, text?, boardText? }

export const ROOM_COLS = 32;
export const ROOM_ROWS = 18;

export const PLAYER_START = { x: 0, y: 17, facing: 'up' };

// Roads — painted under entities and never block movement.
export const ROADS = [
  { x: 0, y: 6, width: 32, height: 2 },  // Main Street
  { x: 14, y: 2, width: 2, height: 11 }, // Broadway
  { x: 0, y: 12, width: 32, height: 2 }, // Side Street
];

// Display labels for inventory items. Falls back to ID.toUpperCase() if missing.
export const ITEM_LABELS = {
  money: 'MONEY',
  jellybean: 'JELLYBEAN',
  clock: 'CLOCK',
  ticket: 'TICKET',
  rope: 'ROPE',
  dog: 'DOG',
  'coin-1992': '1992 COIN',
  'good-vibes-token': 'GOOD VIBES TOKEN',
};

// Ambient walkers — pure decoration; don't block; no interaction.
export const PEDESTRIANS = [
  { id: 'ped-stroller', x: 1, y: 10, travel: 8, duration: 16, delay: 0,
    palette: { shirt: '#c4a5ff', pants: '#143849', shoes: '#fcd34d', hair: '#3a1f1f', skin: '#e8c8a0' } },
  { id: 'ped-walker',   x: 22, y: 11, travel: 6, duration: 14, delay: 4,
    palette: { shirt: '#5eead4', pants: '#234e52', shoes: '#fcd34d', hair: '#1a1a1a', skin: '#d4a574' } },
  { id: 'ped-jogger',   x: 21, y: 14, travel: 5, duration: 12, delay: 7,
    palette: { shirt: '#ff8a8a', pants: '#0e2535', shoes: '#5eead4', hair: '#5c2e1a', skin: '#f0d9b0' } },
];

export const ENTITIES = [
  // ============================================================
  // PUZZLE ENTITIES
  // ============================================================

  // TRAIN STATION (exit)
  {
    id: 'station',
    type: 'shop',
    name: 'TRAIN STATION',
    x: 13, y: 0, width: 4, height: 2,
    palette: { wall: '#3a1f2b', awning: '#fcd34d', sign: '#fcd34d', door: '#0e2535' },
    interaction: {
      kind: 'exit',
      requiresItem: 'ticket',
      text: 'A wrought-iron gate, polished to a soft glow. The sunset express idles at the platform.',
      boardText: 'The conductor punches your ticket. The doors hiss shut behind you.',
    },
  },

  // BANK
  {
    id: 'bank',
    type: 'shop',
    name: 'BANK',
    x: 4, y: 4, width: 2, height: 2,
    doorSide: 'south',
    palette: { wall: '#1f2e4d', awning: '#5eead4', sign: '#5eead4', door: '#0e2535' },
    interaction: {
      kind: 'code',
      text: 'A sleepy small-town bank. The vault dial is unattended.',
      prompt: 'VAULT CODE',
      code: '0451',
      length: 4,
      rewardItem: 'money',
      rewardCount: 1,
      rewardText: 'You crack the vault. A neat stack of bills lands in your pocket.',
    },
  },

  // TICKET BOOTH
  {
    id: 'booth',
    type: 'shop',
    name: 'TICKET BOOTH',
    x: 22, y: 4, width: 2, height: 2,
    doorSide: 'south',
    palette: { wall: '#3a2d1f', awning: '#ff8a8a', sign: '#fcd34d', door: '#0e2535' },
    interaction: {
      kind: 'code',
      requiresItem: 'clock',
      requiresCount: 4,
      text: 'A weary clerk behind smudged glass. A schedule board reads "LAST TRAIN: 13:37". She eyes the clocks in your arms. "Well then. Tell me — what do all those clocks mean?"',
      lockedText: 'A weary clerk behind smudged glass. A schedule board reads "LAST TRAIN: 13:37". "Come back when you understand the value of time."',
      prompt: 'WHAT DO THE CLOCKS SAY?',
      code: 'MAKETHEMOSTOFIT',
      rewardItem: 'ticket',
      rewardCount: 1,
      rewardText: 'The clerk smiles. "Wisdom worth a ticket." A green ticket slides under the glass.',
    },
  },

  // VENDING — 1×1
  {
    id: 'vending',
    type: 'shop',
    name: 'VENDING',
    x: 27, y: 5, width: 1, height: 1,
    doorSide: 'south',
    palette: { wall: '#2a2a3a', awning: '#ff8a8a', sign: '#fcd34d', door: '#0e2535' },
    interaction: {
      kind: 'trade',
      repeatable: true,
      requiresItem: 'jellybean',
      requiresCount: 2,
      rewardItem: 'clock',
      rewardCount: 1,
      text: 'A friendly vending machine. Hand-stencilled label: "INSERT 2 JELLYBEANS — RECEIVE 1 CLOCK".',
      prompt: 'INSERT',
      rewardText: 'The machine rumbles. A small clockwork clock drops into the tray. Etched on the back: "MAKE THE MOST OF IT."',
      lockedText: 'The machine\'s slot accepts jellybeans only — you don\'t have enough.',
    },
  },

  // GOLDEN DRAGON — pure flavor now (bank clue moved to the chimney heist)
  {
    id: 'restaurant',
    type: 'shop',
    name: 'GOLDEN DRAGON',
    x: 2, y: 14, width: 2, height: 2,
    doorSide: 'north',
    palette: { wall: '#3a1f1f', awning: '#ff8a8a', sign: '#fcd34d', door: '#0e2535' },
    interaction: {
      kind: 'note',
      text: 'The waiter brings dumplings and a fortune cookie. You crack it open: "EVENING HORIZONS REWARD THE PATIENT."',
    },
  },

  // NIGHT OWL CAFE
  {
    id: 'cafe',
    type: 'cafe',
    name: 'NIGHT OWL',
    x: 9, y: 15, width: 2, height: 2,
    doorSide: 'north',
    palette: { wall: '#2a3a1f', awning: '#4ade80', sign: '#fcd34d', door: '#0e2535' },
    interaction: {
      kind: 'note',
      text: 'Warm windows steamed up. The chalkboard reads: "TONIGHT\'S SPECIAL: GOLDEN HOUR LATTE." A regular at the counter hums softly.',
    },
  },

  // CINEMA
  {
    id: 'movie',
    type: 'shop',
    name: 'CINEMA',
    x: 28, y: 14, width: 2, height: 2,
    doorSide: 'north',
    palette: { wall: '#3a1f1f', awning: '#fcd34d', sign: '#ff8a8a', door: '#0e2535' },
    interaction: {
      kind: 'note',
      text: 'NOW SHOWING: "TIME TICKING" — SOLD OUT. The marquee blinks gently: "EVERY SHOWING SELLS OUT — DON\'T WAIT."',
    },
  },

  // MAIN STREET CLUSTER — south side, doors face NORTH toward Main Street
  {
    id: 'pinball', type: 'shop', name: 'PINBALL', x: 2, y: 8, width: 2, height: 2,
    doorSide: 'north',
    palette: { wall: '#1a0a3d', awning: '#c4a5ff', sign: '#5eead4', door: '#0e2535' },
    interaction: { kind: 'note', text: 'Rows of pinball machines flash and chime. The high-score table reads "999999 — INSERT COIN — TIME IS UP". The owner snores behind the counter.' },
  },
  {
    id: 'catcafe', type: 'cafe', name: 'CAT CAFE', x: 6, y: 8, width: 2, height: 2,
    doorSide: 'north',
    palette: { wall: '#3a2a3a', awning: '#ff9eb5', sign: '#fcd34d', door: '#0e2535' },
    interaction: { kind: 'note', text: 'Cats everywhere. Yogi the orange one yawns and stretches across a sign: "EVERY MOMENT IS WORTH A NAP." A tabby blinks slowly at you.' },
  },
  {
    id: 'taco', type: 'shop', name: 'TACOS', x: 11, y: 8, width: 2, height: 2,
    doorSide: 'north',
    palette: { wall: '#5a3a1a', awning: '#fcd34d', sign: '#fcd34d', door: '#0e2535' },
    interaction: { kind: 'note', text: 'The truck is shuttered. A handwritten note on the window: "BACK AT 13:37 — DO NOT MISS US."' },
  },
  {
    id: 'newsstand', type: 'shop', name: 'NEWS', x: 18, y: 8, width: 2, height: 2,
    doorSide: 'north',
    palette: { wall: '#2a2a2a', awning: '#888888', sign: '#fcd34d', door: '#0e2535' },
    interaction: { kind: 'note', text: 'Today\'s headline: "LAST TRAIN AT 13:37 — CATCH THE GOLDEN HOUR." None of these papers are dated.' },
  },
  {
    id: 'candy', type: 'shop', name: 'SWEET TOOTH', x: 24, y: 8, width: 2, height: 2,
    doorSide: 'north',
    palette: { wall: '#3a1f3a', awning: '#ff9eb5', sign: '#fcd34d', door: '#0e2535' },
    interaction: {
      kind: 'code',
      text: 'A wall of jars. Next to the biggest jar, a hand-lettered sign: "GUESS HOW MANY JELLYBEANS — WIN THE BAG."',
      prompt: 'HOW MANY JELLYBEANS?',
      code: '247',
      length: 4,
      rewardItem: 'jellybean',
      rewardCount: 8,
      rewardText: 'A whoop and a bell. The shopkeeper tips out a fat bag of jellybeans into your hand.',
    },
  },

  // ============================================================
  // PHONE BOOTH — 5 south houses' numbers concatenate to the code
  //   13 + 37 + 04 + 51 + 99 = 1337045199
  // ============================================================
  {
    id: 'phonebooth',
    type: 'phonebooth',
    name: 'PHONE',
    x: 15, y: 14, width: 1, height: 2,
    interaction: {
      kind: 'code',
      text: 'A glass phone booth. The receiver dangles, dial tone humming. Above the keypad: "Whisper of the street: dial the houses, left to right."',
      prompt: 'ENTER PHONE NUMBER',
      code: '1337045199',
      length: 10,
      rewardItem: 'clock',
      rewardCount: 1,
      rewardText: 'A clock drops out of the coin return — apparently the line rewards thoughtful callers.',
    },
  },

  // ============================================================
  // COIN — small glint on the road, pickup → 1992 COIN
  // ============================================================
  {
    id: 'coin-on-road',
    type: 'coin',
    x: 4, y: 7,
    interaction: {
      kind: 'pickup',
      text: 'A small gold coin sits on the asphalt. The face reads "1992". You pocket it.',
      rewardItem: 'coin-1992',
      rewardCount: 1,
    },
    disappearWhenSolved: true,
  },

  // ============================================================
  // FOUNTAIN — 1×1, decorative + note
  // ============================================================
  {
    id: 'fountain-main',
    type: 'fountain',
    x: 17, y: 10, width: 1, height: 1,
    interaction: {
      kind: 'note',
      text: 'A bronze plaque on the fountain\'s base: "SERVING RECYCLED WATER — HELPED SAVE 21,903 BOTTLES."',
    },
  },

  // ============================================================
  // HOUSES — north residential (rows 2-3)
  // ============================================================
  // house-n1 — plain
  { id: 'house-n1', type: 'house', x: 1, y: 2, width: 2, height: 2, number: 42,
    palette: { wall: '#c48a6a', roof: '#7a3a3a', trim: '#fcd34d' } },

  // house-n2 — DOG HIDES HERE (pickup → dog)
  {
    id: 'house-n2', type: 'house', x: 7, y: 2, width: 2, height: 2, number: 44,
    palette: { wall: '#a78bfa', roof: '#4a2a5a', trim: '#fcd34d' },
    interaction: {
      kind: 'pickup',
      text: 'You knock. The door creaks open — nobody home. A small brown dog peeks out from under a sofa, tail thumping. She bounds over and tags along.',
      rewardItem: 'dog',
      rewardCount: 1,
      rewardText: '(Empty house. Biscuit is already trotting alongside you.)',
    },
  },

  // house-n3 — flavor; has a chimney for visual variety
  { id: 'house-n3', type: 'house', x: 18, y: 2, width: 2, height: 2, number: 46,
    chimney: true,
    palette: { wall: '#7ed492', roof: '#2d4a3e', trim: '#fcd34d' },
    interaction: {
      kind: 'note',
      text: 'A handwritten note on the doorbell: "Catching the 13:37. Watering the plants until I\'m back. — M."',
    },
  },

  // house-n4 — plain
  { id: 'house-n4', type: 'house', x: 28, y: 2, width: 2, height: 2, number: 48,
    palette: { wall: '#f2a7a7', roof: '#5a2a2a', trim: '#fcd34d' } },

  // ============================================================
  // HOUSES — SOUTH (rows 16-17). Numbers concatenate to 1337045199.
  // ============================================================

  // house-s1 (13) — MISSING DOG POSTER (trade: dog → good-vibes-token)
  {
    id: 'house-s1', type: 'house', x: 1, y: 16, width: 2, height: 2, number: 13,
    poster: 'MISSING DOG',
    palette: { wall: '#7a9bd4', roof: '#2a3a5a', trim: '#fcd34d' },
    interaction: {
      kind: 'trade',
      requiresItem: 'dog',
      requiresCount: 1,
      text: 'The owner answers, eyes filling. "BISCUIT! Oh, thank you — please, take this for your trouble."',
      prompt: 'RETURN BISCUIT',
      rewardItem: 'good-vibes-token',
      rewardCount: 1,
      rewardText: 'You receive a GOOD VIBES TOKEN. A warm hand-shake, a tail wag, and the door closes behind a reunited family.',
      lockedText: 'A faded poster on the door reads: "MISSING — BISCUIT — SMALL, BROWN, VERY WIGGLY. PLEASE BRING HER HOME." The owner is out searching.',
    },
  },

  // house-s2 (37) — flavor; chimney for variety
  {
    id: 'house-s2', type: 'house', x: 5, y: 16, width: 2, height: 2, number: 37,
    chimney: true,
    palette: { wall: '#d4b58a', roof: '#5a3a2a', trim: '#fcd34d' },
    interaction: {
      kind: 'note',
      text: 'A welcome mat reads "LIVE LOUDLY." Wind chimes tinkle by the door. Nobody answers, but it feels alive in there.',
    },
  },

  // house-s3 (04) — flavor
  { id: 'house-s3', type: 'house', x: 18, y: 16, width: 2, height: 2, number: 4,
    palette: { wall: '#a78bfa', roof: '#3a2a5a', trim: '#fcd34d' } },

  // house-s4 (51) — GOBLIN TELLER HEIST (chimney + rope → bank code)
  {
    id: 'house-s4', type: 'house', x: 22, y: 16, width: 2, height: 2, number: 51,
    chimney: true,
    palette: { wall: '#7ed492', roof: '#2a4a3a', trim: '#fcd34d' },
    interaction: {
      kind: 'trade',
      requiresItem: 'rope',
      requiresCount: 1,
      text: 'The chimney looms above. With your rope, you could scramble up.',
      prompt: 'CLIMB CHIMNEY',
      rewardText: 'You scramble up the chimney with your rope. Inside, the goblin teller has left their notes lying around. On one slip: "VAULT CODE = 0451." You shimmy back down, undetected.',
      lockedText: 'A row of placards: "SECURED BY ETP". The front door bristles with alarms. The chimney is unguarded — but you\'d need rope to climb up.',
      // info-only trade (no rewardItem)
    },
  },

  // house-s5 (99) — flavor
  { id: 'house-s5', type: 'house', x: 28, y: 16, width: 2, height: 2, number: 99,
    palette: { wall: '#f2c1a7', roof: '#5a3a2a', trim: '#fcd34d' } },

  // ============================================================
  // LAMP POSTS
  // ============================================================
  // Row 5 (north sidewalk of Main Street)
  { id: 'lamp-n1', type: 'lamp', x: 0, y: 5 },
  { id: 'lamp-n2', type: 'lamp', x: 9, y: 5 },
  { id: 'lamp-n3', type: 'lamp', x: 12, y: 5 },
  { id: 'lamp-n4', type: 'lamp', x: 17, y: 5 },
  { id: 'lamp-n5', type: 'lamp', x: 20, y: 5 },
  { id: 'lamp-n6', type: 'lamp', x: 26, y: 5 },
  { id: 'lamp-n7', type: 'lamp', x: 31, y: 5 },
  // Row 8 (south sidewalk of Main Street, between shops)
  { id: 'lamp-m1', type: 'lamp', x: 9, y: 8 },
  { id: 'lamp-m2', type: 'lamp', x: 16, y: 8 },
  { id: 'lamp-m3', type: 'lamp', x: 22, y: 8 },
  { id: 'lamp-m4', type: 'lamp', x: 27, y: 8 },
  // Row 11 (north of Side Street)
  { id: 'lamp-p1', type: 'lamp', x: 0, y: 11 },
  { id: 'lamp-p2', type: 'lamp', x: 7, y: 11 },
  { id: 'lamp-p3', type: 'lamp', x: 12, y: 11 },
  { id: 'lamp-p4', type: 'lamp', x: 22, y: 11 },
  { id: 'lamp-p5', type: 'lamp', x: 28, y: 11 },
  // Row 14 (south sidewalk of Side Street)
  { id: 'lamp-s1', type: 'lamp', x: 0, y: 14 },
  { id: 'lamp-s2', type: 'lamp', x: 7, y: 14 },
  { id: 'lamp-s3', type: 'lamp', x: 14, y: 14 },
  { id: 'lamp-s4', type: 'lamp', x: 20, y: 14 },
  { id: 'lamp-s5', type: 'lamp', x: 26, y: 14 },
  { id: 'lamp-s6', type: 'lamp', x: 31, y: 14 },

  // ============================================================
  // TREES, PLANTERS, BENCHES
  // ============================================================
  { id: 'tree-n1', type: 'tree', x: 4, y: 3 },
  { id: 'tree-n2', type: 'tree', x: 11, y: 2 },
  { id: 'tree-n3', type: 'tree', x: 25, y: 3 },
  { id: 'tree-m1', type: 'tree', x: 10, y: 11 },
  { id: 'tree-m2', type: 'tree', x: 25, y: 11 },
  { id: 'tree-s1', type: 'tree', x: 13, y: 15 },
  { id: 'tree-s2', type: 'tree', x: 25, y: 15 },

  { id: 'planter-1', type: 'planter', x: 15, y: 10 },
  { id: 'planter-2', type: 'planter', x: 19, y: 10 },
  { id: 'planter-3', type: 'planter', x: 5, y: 11 },
  { id: 'planter-4', type: 'planter', x: 17, y: 15 },

  // Benches: north sidewalk + south sidewalk (the one in the road is gone)
  { id: 'bench-1', type: 'bench', x: 8, y: 5 },
  { id: 'bench-2', type: 'bench', x: 21, y: 14 },

  // ============================================================
  // SIGNAGE + PEOPLE
  // ============================================================
  { id: 'corner-main-broadway', type: 'corner', x: 13, y: 5, text: 'MAIN ST × BROADWAY' },
  { id: 'corner-side', type: 'corner', x: 13, y: 11, text: 'SIDE ST × BROADWAY' },

  // BUSKER — pay $1, learn jellybean count
  {
    id: 'busker', type: 'npc', name: 'BUSKER',
    x: 16, y: 5,
    palette: { shirt: '#4ade80', pants: '#234e52', shoes: '#fcd34d', hair: '#2b0b4a' },
    interaction: {
      kind: 'trade',
      requiresItem: 'money',
      requiresCount: 1,
      text: 'A guitar player nods, fingers picking out a soft tune. "Curious about that jellybean jar at the candy store? Counted them once. Got a tip for me?"',
      prompt: 'TIP $1',
      rewardText: 'She pockets the cash. "Two hundred forty-seven. Don\'t forget."',
      lockedText: 'She smiles wistfully. "Free music for tips. No tips, no extras."',
    },
  },

  // GARDENER — gives ROPE (the heist enabler)
  {
    id: 'gardener', type: 'npc', name: 'GARDENER',
    x: 16, y: 11,
    palette: { shirt: '#fcd34d', pants: '#2d6b3a', shoes: '#5c4033', hair: '#5c2e1a' },
    interaction: {
      kind: 'pickup',
      text: 'A gardener tending the planter. "Lovely evening, traveler. Here — take this rope. I keep too much. Never know when you\'ll need to climb something."',
      rewardItem: 'rope',
      rewardCount: 1,
      rewardText: 'The gardener smiles. "Plenty more where that came from. Use it wisely."',
    },
  },

  // KID — hints about the phone-number puzzle
  {
    id: 'kid', type: 'npc', name: 'KID',
    x: 11, y: 17,
    palette: { shirt: '#ff8a8a', pants: '#5eead4', shoes: '#fcd34d', hair: '#1a1a1a', skin: '#f0c599' },
    interaction: {
      kind: 'note',
      text: '"Hey! Bet you didn\'t notice — every house on our street is part of a phone number. Read \'em left to right and dial \'em all into the phone booth. My dad says don\'t trust the 13:37 signs either."',
    },
  },

  // MYSTERIOUS STRANGER — visually distinct (dark coat, golden hair)
  {
    id: 'stranger', type: 'npc', name: 'STRANGER',
    x: 4, y: 11,
    palette: { shirt: '#0e2535', pants: '#0e2535', shoes: '#1a1a1a',
               hair: '#fcd34d', shirtShadow: '#143849', skin: '#f0c599' },
    interaction: {
      kind: 'note',
      text: 'A figure in a dark coat. Gold hair catches the lamp-light. Eyes sharp. "Have we met? Maybe in another life. Keep walking — but don\'t forget what you see."',
    },
  },
];
