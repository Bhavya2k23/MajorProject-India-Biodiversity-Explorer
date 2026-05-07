/**
 * getSpeciesIcon.js
 * Zero-dependency emoji/icon mapper for species.
 * Replaces ALL external image API calls.
 * Used by backend controllers to add an `icon` field to responses.
 */

// ─── Type-based default icons ─────────────────────────────────────
const TYPE_ICONS = {
  Mammal:     "🐾",
  Bird:       "🦅",
  Reptile:    "🦎",
  Amphibian:  "🐸",
  Fish:       "🐟",
  Insect:     "🦋",
  Arachnid:   "🕷️",
  Crustacean: "🦀",
  Mollusk:    "🐚",
  Plant:      "🌿",
  Tree:       "🌳",
  Herb:       "🌱",
  Shrub:      "🌾",
  Other:      "🐾",
};

// ─── Name-based specific icons ─────────────────────────────────────
// Keyed by lowercase common name fragments
const NAME_ICONS = {
  // Big cats
  tiger:        "🐅",
  lion:         "🦁",
  leopard:      "🐆",
  cheetah:      "🐆",
  "snow leopard": "🐆",
  "clouded leopard": "🐆",

  // Primates
  monkey:       "🐒",
  macaque:      "🐒",
  langur:       "🐒",
  gibbon:       "🐒",
  orangutan:    "🦧",

  // Pachyderms
  elephant:     "🐘",
  rhinoceros:   "🦏",
  rhino:        "🦏",
  hippopotamus: "🦛",

  // Bears & canids
  bear:         "🐻",
  wolf:         "🐺",
  fox:          "🦊",
  dog:          "🐕",
  jackal:       "🐺",

  // Deer & ungulates
  deer:         "🦌",
  stag:         "🦌",
  gaur:         "🐂",
  bison:        "🦬",
  buffalo:      "🐃",
  nilgai:       "🦌",
  blackbuck:    "🦌",
  chinkara:     "🦌",
  chital:       "🦌",
  sambar:       "🦌",
  barking:      "🦌",

  // Birds
  peacock:      "🦚",
  peafowl:      "🦚",
  eagle:        "🦅",
  hawk:         "🦅",
  falcon:       "🦅",
  osprey:       "🦅",
  kite:         "🦅",
  vulture:      "🦅",
  owl:          "🦉",
  hornbill:     "🦜",
  parrot:       "🦜",
  parakeet:     "🦜",
  crane:        "🦢",
  flamingo:     "🦩",
  heron:        "🦢",
  egret:        "🦢",
  stork:        "🦢",
  ibis:         "🦢",
  pelican:      "🐦",
  cormorant:    "🐦",
  kingfisher:   "🐦",
  sparrow:      "🐦",
  robin:        "🐦",
  swift:        "🐦",
  swallow:      "🐦",
  pigeon:       "🕊️",
  dove:         "🕊️",
  duck:         "🦆",
  goose:        "🦆",
  teal:         "🦆",
  mynah:        "🐦",
  sunbird:      "🐦",
  weaver:       "🐦",
  warbler:      "🐦",
  cuckoo:       "🐦",
  woodpecker:   "🐦",
  drongo:       "🐦",

  // Reptiles
  crocodile:    "🐊",
  gharial:      "🐊",
  alligator:    "🐊",
  lizard:       "🦎",
  monitor:      "🦎",
  gecko:        "🦎",
  chameleon:    "🦎",
  snake:        "🐍",
  cobra:        "🐍",
  python:       "🐍",
  viper:        "🐍",
  boa:          "🐍",
  turtle:       "🐢",
  tortoise:     "🐢",
  terrapin:     "🐢",

  // Amphibians
  frog:         "🐸",
  toad:         "🐸",
  salamander:   "🐸",
  caecilian:    "🐸",

  // Marine & aquatic
  shark:        "🦈",
  ray:          "🐟",
  dolphin:      "🐬",
  whale:        "🐳",
  dugong:       "🐬",
  "sea cow":    "🐬",
  fish:         "🐟",
  catfish:      "🐟",
  carp:         "🐟",
  trout:        "🐟",
  mahseer:      "🐟",
  crab:         "🦀",
  lobster:      "🦞",
  shrimp:       "🦐",
  prawn:        "🦐",
  oyster:       "🦪",
  clam:         "🐚",
  mussel:       "🐚",
  snail:        "🐌",
  jellyfish:    "🪼",
  coral:        "🪸",
  octopus:      "🐙",
  squid:        "🦑",

  // Insects & arachnids
  butterfly:    "🦋",
  moth:         "🦋",
  bee:          "🐝",
  wasp:         "🐝",
  ant:          "🐜",
  beetle:       "🐞",
  ladybug:      "🐞",
  dragonfly:    "🪲",
  grasshopper:  "🦗",
  cricket:      "🦗",
  spider:       "🕷️",
  scorpion:     "🦂",

  // Plants
  lotus:        "🪷",
  rose:         "🌹",
  orchid:       "🌸",
  lily:         "🌷",
  tulip:        "🌷",
  sunflower:    "🌻",
  jasmine:      "🌸",
  marigold:     "🌼",
  hibiscus:     "🌺",
  bamboo:       "🎋",
  palm:         "🌴",
  coconut:      "🥥",
  banana:       "🍌",
  mango:        "🥭",
  tree:         "🌳",
  oak:          "🌳",
  pine:         "🌲",
  cedar:        "🌲",
  teak:         "🌳",
  sandalwood:   "🌳",
  neem:         "🌳",
  banyan:       "🌳",
  peepal:       "🌳",
  fern:         "🌿",
  moss:         "🌿",
  grass:        "🌾",
  reed:         "🌾",
  herb:         "🌱",
  tulsi:        "🌱",
  basil:        "🌱",
  aloe:         "🌵",
  cactus:       "🌵",
  mushroom:     "🍄",
  seaweed:      "🌿",
  mangrove:     "🌳",
  sundari:      "🌳",
  rhododendron: "🌸",
};

/**
 * Get the best emoji icon for a species.
 * @param {string} name - Common name (e.g. "Bengal Tiger")
 * @param {string} type - Species type (e.g. "Mammal", "Bird")
 * @param {string} [scientificName] - Scientific name (optional)
 * @returns {string} Single emoji character
 */
function getSpeciesIcon(name = "", type = "", scientificName = "") {
  const lower = (name || "").toLowerCase().trim();

  // 1. Exact match on full name
  if (NAME_ICONS[lower]) return NAME_ICONS[lower];

  // 2. Partial match — check if any key is contained in the name
  for (const [key, icon] of Object.entries(NAME_ICONS)) {
    if (lower.includes(key)) return icon;
  }

  // 3. Fall back to type-based icon
  if (type && TYPE_ICONS[type]) return TYPE_ICONS[type];

  // 4. Scientific name genus check
  const genus = (scientificName || "").split(" ")[0].toLowerCase();
  const GENUS_ICONS = {
    panthera: "🐅", elephas: "🐘", pavo: "🦚",
    cervus: "🦌", axis: "🦌", bubalus: "🐃",
    crocodylus: "🐊", gavialis: "🐊", naja: "🐍",
    python: "🐍", ursus: "🐻", melursus: "🐻",
    grus: "🦢", phoenicopterus: "🦩", pelecanus: "🐦",
    aquila: "🦅", accipiter: "🦅", falco: "🦅",
    canis: "🐺", vulpes: "🦊", bos: "🐂",
    rhinoceros: "🦏", dicerorhinus: "🦏",
    delphinus: "🐬", balaenoptera: "🐳",
    ficus: "🌳", tectona: "🌳", santalum: "🌳",
    nelumbo: "🪷", ocimum: "🌱", azadirachta: "🌳",
  };
  if (GENUS_ICONS[genus]) return GENUS_ICONS[genus];

  // 5. Ultimate fallback
  return "🐾";
}

/**
 * Get background color class for icon display based on type.
 * @param {string} type - Species type
 * @returns {string} CSS-compatible color string
 */
function getIconBgColor(type = "") {
  const colors = {
    Mammal:     "#f97316", // orange
    Bird:       "#3b82f6", // blue
    Reptile:    "#22c55e", // green
    Amphibian:  "#84cc16", // lime
    Fish:       "#06b6d4", // cyan
    Insect:     "#a855f7", // purple
    Arachnid:   "#6b7280", // gray
    Crustacean: "#f59e0b", // amber
    Mollusk:    "#ec4899", // pink
    Plant:      "#16a34a", // dark green
    Tree:       "#15803d", // forest green
    Herb:       "#65a30d", // light green
    Shrub:      "#4ade80", // medium green
    Other:      "#78716c", // stone
  };
  return colors[type] || "#78716c";
}

module.exports = { getSpeciesIcon, getIconBgColor, TYPE_ICONS, NAME_ICONS };
