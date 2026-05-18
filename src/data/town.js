// Town entities — swap, add, or design more. The shape is:
//
//   id           unique key (also used as inventory id when rewardItem === id)
//   type         'shop' | 'cafe' | 'billboard' | 'corner' | 'npc'
//   x, y         top-left tile of the entity footprint
//   width        tiles wide  (default 1)
//   height       tiles tall  (default 1)
//   name         display name (shops, cafes, npcs)
//   text         label text for billboards/corners (always-visible)
//   palette      optional color overrides (see Shop/Cafe defaults below)
//   interaction  dialog logic — omit for purely decorative entities (corners)
//
// Multi-tile entities (shop/cafe with width/height > 1) block movement on every
// footprint tile. You interact with an entity by standing on any tile that is
// orthogonally adjacent to its footprint and pressing SPACE / E.
//
// Interaction kinds (counts default to 1 when omitted):
//   { kind: 'note',  text }
//   { kind: 'code',  prompt, code, length?, text, lockedText?,
//                    requiresItem?, requiresCount?,    // gate: must have item to attempt
//                    rewardItem?, rewardCount?, rewardText? }
//   { kind: 'trade', prompt, text, lockedText, rewardText,
//                    requiresItem, requiresCount?,     // consumed on trade
//                    rewardItem?, rewardCount?,        // omit for info-only trades
//                    repeatable?: true                  // can trade more than once }
//   { kind: 'exit',  requiresItem, text?, boardText? }

export const ROOM_COLS = 32;
export const ROOM_ROWS = 18;

export const PLAYER_START = { x: 0, y: 17, facing: 'up' };

// Roads are painted under entities and never block movement — the player can
// walk anywhere. They're purely visual / wayfinding.
export const ROADS = [
  // Main Street — horizontal across the middle of the map (the busy strip)
  { x: 0, y: 6, width: 32, height: 2 },
  // Broadway — vertical, runs from train station down through Main Street
  { x: 14, y: 2, width: 2, height: 11 },
  // Side Street — horizontal across the south
  { x: 0, y: 12, width: 32, height: 2 },
];

export const ENTITIES = [
  // ============================================================
  // SCATTERED — landmarks and puzzle entities away from Main Street
  // ============================================================

  // SKYLINE EXPRESS (exit) — top of Broadway, landmark size
  {
    id: 'station',
    type: 'shop',
    name: 'SKYLINE EXPRESS',
    x: 13, y: 0, width: 4, height: 2,
    palette: { wall: '#4a6b5a', awning: '#fcd34d', sign: '#fcd34d', door: '#1a3d4a' },
    interaction: {
      kind: 'exit',
      requiresItem: 'ticket',
      text: 'Glass canopy, vines on the columns. The sunset express idles on the platform — golden light on the windows.',
      boardText: 'The conductor stamps your day pass. You find a window seat as the city rolls past in honey light.',
    },
  },

  // BANK — north of Main Street, west side
  {
    id: 'bank',
    type: 'shop',
    name: 'CREDIT UNION',
    x: 4, y: 4, width: 2, height: 2,
    palette: { wall: '#3d5a6b', awning: '#5eead4', sign: '#5eead4', door: '#1a3d4a' },
    interaction: {
      kind: 'code',
      text: 'A sunny branch with plants in every window. The community vault dial is open for the annual puzzle day.',
      prompt: 'VAULT CODE',
      code: '0451',
      length: 4,
      rewardItem: 'money',
      rewardCount: 1,
      rewardText: 'The vault sings a little chime. A crisp bill lands in your pocket — prize money for the plaza.',
    },
  },

  // TICKET BOOTH — north of Main Street, near the station
  {
    id: 'booth',
    type: 'shop',
    name: 'DAY PASS',
    x: 22, y: 4, width: 2, height: 2,
    palette: { wall: '#5a4a3a', awning: '#ff6b6b', sign: '#fcd34d', door: '#1a3d4a' },
    interaction: {
      kind: 'code',
      requiresItem: 'clock',
      requiresCount: 4,
      text: 'A bright clerk behind spotless glass. A board reads "SUNSET RIDE: 13:37". She grins at the clocks in your arms. "You really get it. So — what do they all say together?"',
      lockedText: 'The clerk taps the schedule. "Sunset ride\'s at 13:37. Come back when you\'ve collected enough clocks to know what time is for."',
      prompt: 'WHAT DO THE CLOCKS SAY?',
      code: 'MAKETHEMOSTOFIT',
      rewardItem: 'ticket',
      rewardCount: 1,
      rewardText: '"That\'s the whole city in one phrase." She slides a golden day pass under the glass.',
    },
  },

  // VENDING — tucked east of the Ticket Booth
  {
    id: 'vending',
    type: 'shop',
    name: 'SOLAR SNACK',
    x: 27, y: 4, width: 2, height: 2,
    palette: { wall: '#4a5a4a', awning: '#ff6b6b', sign: '#fcd34d', door: '#1a3d4a' },
    interaction: {
      kind: 'trade',
      repeatable: true,
      requiresItem: 'jellybean',
      requiresCount: 2,
      rewardItem: 'clock',
      rewardCount: 1,
      text: 'A solar-powered kiosk hums happily. Sticker: "2 JELLYBEANS → 1 POCKET CLOCK".',
      prompt: 'INSERT',
      rewardText: 'The tray pings. A tiny clock drops out, warm from the sun. Etched on the back: "MAKE THE MOST OF IT."',
      lockedText: 'The slot glows green for jellybeans — you need a couple more.',
    },
  },

  // GOLDEN DRAGON — scattered south, west side
  {
    id: 'restaurant',
    type: 'shop',
    name: 'GOLDEN DRAGON',
    x: 2, y: 14, width: 2, height: 2,
    palette: { wall: '#6b4a3a', awning: '#ff6b6b', sign: '#fcd34d', door: '#1a3d4a' },
    interaction: {
      kind: 'note',
      text: 'Steaming dumplings and a fortune cookie. Inside: "The year this CREDIT UNION was built is the year a famous novel says paper burns. (0451.)"',
    },
  },

  // SUNRISE CAFE — scattered south
  {
    id: 'cafe',
    type: 'cafe',
    name: 'SUNRISE CAFE',
    x: 9, y: 15, width: 2, height: 2,
    palette: { wall: '#4a6b4a', awning: '#4ade80', sign: '#fcd34d', door: '#1a3d4a' },
    interaction: {
      kind: 'note',
      text: 'Open windows, citrus in the air. The chalkboard: "TODAY\'S SPECIAL: FIRST SIP OF THE DAY — ON THE HOUSE." Someone at the bar laughs: "Best view in the city from that rooftop train."',
    },
  },

  // CINEMA — scattered south, east side (red herring)
  {
    id: 'movie',
    type: 'shop',
    name: 'CINEMA',
    x: 28, y: 14, width: 2, height: 2,
    palette: { wall: '#5a3a4a', awning: '#fcd34d', sign: '#ff6b6b', door: '#1a3d4a' },
    interaction: {
      kind: 'note',
      text: 'NOW SHOWING: "GOLDEN HOUR" — SOLD OUT (again). The marquee winks: "EVERY SHOWING SELLS OUT — COME EARLY NEXT TIME."',
    },
  },

  // ============================================================
  // MAIN STREET CLUSTER — south side of Main Street (rows 8-9)
  // ============================================================

  // PINBALL — westmost (red herring)
  {
    id: 'pinball',
    type: 'shop',
    name: 'PINBALL',
    x: 2, y: 8, width: 2, height: 2,
    palette: { wall: '#4a3a6b', awning: '#a78bfa', sign: '#5eead4', door: '#1a3d4a' },
    interaction: {
      kind: 'note',
      text: 'Machines flash like fireflies. The high-score board: "999999 — YOUR TURN — COINS OPTIONAL." The owner waves from a hammock behind the counter.',
    },
  },

  // CAT CAFE (red herring)
  {
    id: 'catcafe',
    type: 'cafe',
    name: 'CAT CAFE',
    x: 6, y: 8, width: 2, height: 2,
    palette: { wall: '#5a4a5a', awning: '#ffb3c6', sign: '#fcd34d', door: '#1a3d4a' },
    interaction: {
      kind: 'note',
      text: 'Cats everywhere. Yogi the orange one sprawls across a sign: "EVERY MOMENT IS WORTH A NAP." A tabby blinks slowly at you in the sun.',
    },
  },

  // TACOS (red herring — 13:37 misdirection)
  {
    id: 'taco',
    type: 'shop',
    name: 'TACOS',
    x: 11, y: 8, width: 2, height: 2,
    palette: { wall: '#7a5a2a', awning: '#fb923c', sign: '#fcd34d', door: '#1a3d4a' },
    interaction: {
      kind: 'note',
      text: 'The truck is on a break. A cheerful note on the window: "BACK AT 13:37 — SAVE ROOM, WE\'RE WORTH IT."',
    },
  },

  // NEWS STAND — across the plaza (red herring)
  {
    id: 'newsstand',
    type: 'shop',
    name: 'NEWS',
    x: 18, y: 8, width: 2, height: 2,
    palette: { wall: '#4a5a5a', awning: '#94a3b8', sign: '#fcd34d', door: '#1a3d4a' },
    interaction: {
      kind: 'note',
      text: 'Today\'s headline: "PLAZA PACKED FOR SUNSET RIDE — LAST DEPARTURE 13:37." The papers smell like fresh ink and street food.',
    },
  },

  // SWEET TOOTH — eastmost (the candy store with the jellybean jar)
  {
    id: 'candy',
    type: 'shop',
    name: 'SWEET TOOTH',
    x: 24, y: 8, width: 2, height: 2,
    palette: { wall: '#5a3a5a', awning: '#f472b6', sign: '#fcd34d', door: '#1a3d4a' },
    interaction: {
      kind: 'code',
      text: 'A wall of rainbow jars. Next to the biggest one: "GUESS HOW MANY JELLYBEANS — WIN THE BAG."',
      prompt: 'HOW MANY JELLYBEANS?',
      code: '247',
      length: 4,
      rewardItem: 'jellybean',
      rewardCount: 8,
      rewardText: 'A whoop and a bell. The shopkeeper tips out a fat bag of jellybeans into your hand.',
    },
  },

  // ============================================================
  // PEOPLE & SIGNAGE
  // ============================================================

  // STREET CORNER — at the Broadway × Main Street intersection
  {
    id: 'corner-main-broadway',
    type: 'corner',
    x: 13, y: 5,
    text: 'LUMEN PLAZA',
  },

  // BUSKER — in the plaza right alongside Broadway, north of Main Street
  {
    id: 'busker',
    type: 'npc',
    name: 'BUSKER',
    x: 16, y: 5,
    palette: { shirt: '#4ade80', pants: '#2d5a4a', shoes: '#fcd34d', hair: '#3d2a1a' },
    interaction: {
      kind: 'trade',
      requiresItem: 'money',
      requiresCount: 1,
      text: 'A guitar player grins in the sun. "Curious about that jellybean jar at the candy store? Counted them once. Got a tip for me?"',
      prompt: 'TIP $1',
      rewardText: 'He pockets the cash. "Two hundred forty-seven. Don\'t forget."',
      lockedText: 'He strums a chord. "Free music for tips. No tips, no extras — fair trade."',
    },
  },
];
