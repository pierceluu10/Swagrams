/** Swagrams — word pools (easy/hard racks and valid answers for "missed words") */

export type WordPoolEntry = {
  rack: string;
  difficulty: "easy" | "hard";
  answers: string[];
};

function leftoverRack(word: string, rack: string): Map<string, number> | null {
  const bag = new Map<string, number>();
  for (const ch of rack.toLowerCase()) {
    bag.set(ch, (bag.get(ch) ?? 0) + 1);
  }
  for (const ch of word.toLowerCase()) {
    const n = bag.get(ch);
    if (n === undefined || n < 1) return null;
    bag.set(ch, n - 1);
  }
  return bag;
}

function isValidAnswer(word: string, rack: string): boolean {
  const w = word.toLowerCase();
  const r = rack.toLowerCase();
  if (w.length < 3 || w.length > 6 || w.length > r.length) return false;
  return leftoverRack(w, r) !== null;
}

function assertEntry(entry: WordPoolEntry) {
  const r = entry.rack.slice(0, 6).toLowerCase();
  if (r.length !== 6) {
    throw new Error(`pool "${entry.rack}": rack must be 6 letters`);
  }
  for (const a of entry.answers) {
    if (!isValidAnswer(a, r)) {
      throw new Error(`pool "${entry.rack}": answer "${a}" is not buildable from rack`);
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Easy pools                                                        */
/* ------------------------------------------------------------------ */

const easyEntries: WordPoolEntry[] = [
  {
    rack: "silent",
    difficulty: "easy",
    answers: [
      "silent", "listen", "enlist", "tinsel", "inlets",
      "islet", "stein", "liens", "lines", "tiles", "lints", "tines",
      "site", "ties", "lite", "tile", "line", "lint", "nest", "nets", "tens", "lent", "tine",
      "let", "lie", "lit", "net", "nil", "nit", "set", "sin", "sit", "ten", "tie", "tin"
    ]
  },
  {
    rack: "stream",
    difficulty: "easy",
    answers: [
      "stream", "master", "tamers",
      "steam", "smear", "teams", "meats", "mater", "tamer",
      "east", "mare", "mast", "mate", "meat", "mesa", "rate", "ream", "rest", "same", "seam", "sear", "seat", "star", "stem", "tame", "team", "tear", "term",
      "are", "arm", "art", "ate", "ear", "eat", "era", "mar", "mat", "met", "ram", "rat", "sat", "sea", "set", "tar", "tea"
    ]
  },
  {
    rack: "rescue",
    difficulty: "easy",
    answers: [
      "rescue", "secure", "recuse",
      "curse", "ecru",
      "ruse", "sere", "sure", "user",
      "cur", "sue", "use"
    ]
  },
  {
    rack: "retain",
    difficulty: "easy",
    answers: [
      "retain", "retina", "ratine",
      "train", "inert", "inter", "irate", "tinea",
      "earn", "near", "neat", "rain", "rant", "rate", "rein", "rent", "rite", "tarn", "tear", "tern", "tier", "tine", "tire",
      "air", "ant", "are", "art", "ate", "ear", "eat", "era", "ire", "net", "nit", "ran", "rat", "tan", "tar", "tea", "ten", "tie", "tin"
    ]
  },
  {
    rack: "friend",
    difficulty: "easy",
    answers: [
      "friend", "finder", "redfin",
      "fiend", "fried", "infer",
      "dine", "dire", "fend", "fern", "find", "fine", "fire", "rein", "rend", "ride", "rind",
      "den", "din", "end", "fed", "fin", "fir", "ire", "red", "ref", "rid"
    ]
  },
  {
    rack: "planet",
    difficulty: "easy",
    answers: [
      "planet", "platen",
      "lane", "late", "lean", "leap", "lent", "nape", "neat", "pale", "pane", "pant", "peal", "peat", "pelt", "plan", "plat", "plea", "tale", "tape",
      "ale", "ant", "ape", "ate", "eat", "lap", "lea", "let", "nap", "net", "pal", "pan", "pat", "pea", "pen", "pet", "tan", "tap", "tea", "ten"
    ]
  },
  {
    rack: "danger",
    difficulty: "easy",
    answers: [
      "danger", "gander", "garden", "ranged",
      "anger", "grade", "grand", "range",
      "aged", "dare", "darn", "dear", "drag", "earn", "gear", "near", "rage", "rand", "read", "rend",
      "age", "and", "are", "den", "ear", "end", "era", "nag", "rag", "ran", "red"
    ]
  },
  {
    rack: "random",
    difficulty: "easy",
    answers: [
      "random",
      "roman", "nomad",
      "darn", "dram", "morn", "norm", "rand", "road", "roam",
      "and", "arm", "dam", "don", "mad", "man", "mar", "mod", "nod", "nor", "oar", "ram", "ran", "rod"
    ]
  },
  {
    rack: "orange",
    difficulty: "easy",
    answers: [
      "orange", "onager",
      "anger", "range", "organ",
      "earn", "gear", "gone", "near", "rage",
      "age", "ago", "are", "ear", "ego", "era", "nag", "nor", "oar", "one", "ore", "rag", "ran", "roe"
    ]
  },
  {
    rack: "copper",
    difficulty: "easy",
    answers: [
      "copper",
      "cope", "core", "crop", "pope", "pore", "prep", "prop", "rope",
      "cop", "ore", "pep", "per", "pop", "pro", "rep", "roe"
    ]
  },
  {
    rack: "laptop",
    difficulty: "easy",
    answers: [
      "laptop",
      "opal", "alto",
      "atop", "plat", "plot",
      "lap", "lot", "oat", "opt", "pal", "pat", "pot", "tap", "top"
    ]
  },
  {
    rack: "hearts",
    difficulty: "easy",
    answers: [
      "hearts", "earths", "haters",
      "heart", "earth", "haste", "hater", "rates", "tears", "hares", "share", "shear",
      "east", "hare", "hate", "hear", "heat", "rash", "rate", "rest", "sear", "seat", "star", "tear",
      "are", "art", "ash", "ate", "ear", "eat", "era", "has", "hat", "her", "rat", "sat", "sea", "set", "she", "tar", "tea", "the"
    ]
  },
  {
    rack: "stared",
    difficulty: "easy",
    answers: [
      "stared", "trades", "treads",
      "trade", "tread", "rated", "reads", "dares", "dater", "dates", "darts", "stare", "sated", "stead",
      "dare", "dart", "date", "dear", "east", "rate", "read", "rest", "sear", "seat", "star", "tear",
      "are", "art", "ate", "ear", "eat", "era", "rat", "red", "sad", "sat", "sea", "set", "tad", "tar", "tea"
    ]
  },
  {
    rack: "admire",
    difficulty: "easy",
    answers: [
      "admire",
      "dream", "media", "armed", "aimed", "amide", "mired",
      "aide", "amid", "dame", "dare", "dear", "dime", "dire", "dram", "idea", "made", "maid", "mare", "mead", "mire", "raid", "read", "ream", "ride",
      "aid", "aim", "air", "are", "arm", "dam", "dim", "ear", "era", "ire", "mad", "mar", "mid", "ram", "red", "rid", "rim"
    ]
  },
  {
    rack: "senior",
    difficulty: "easy",
    answers: [
      "senior", "nosier",
      "noise", "irons", "resin", "risen",
      "iron", "nose", "rein", "rise", "rose", "sine", "sire", "sore",
      "ion", "ire", "nor", "one", "ore", "roe", "sin", "sir", "son"
    ]
  },
  {
    rack: "carets",
    difficulty: "easy",
    answers: [
      "caster", "caters", "crates", "reacts", "traces", "carets", "recast",
      "acre", "care", "cart", "case", "cast", "east", "race", "rate", "rest", "scar", "sear", "seat", "star", "tear",
      "ace", "act", "arc", "are", "art", "ate", "car", "cat", "ear", "eat", "era", "rat", "sac", "sat", "sea", "set", "tar", "tea"
    ]
  },
  {
    rack: "alerts",
    difficulty: "easy",
    answers: [
      "alerts", "staler", "talers",
      "alter", "later", "stale", "slate", "tales", "least", "steal", "alert",
      "east", "last", "late", "lest", "rate", "real", "rest", "sale", "salt", "seal", "sear", "seat", "star", "tale", "tear",
      "ale", "are", "art", "ate", "ear", "eat", "era", "lea", "let", "rat", "sat", "sea", "set", "tar", "tea"
    ]
  },
  {
    rack: "action",
    difficulty: "easy",
    answers: [
      "action", "cation", "atonic",
      "coat", "coin",
      "act", "ant", "can", "cat", "cot", "ion", "nit", "not", "oat", "tan", "tin", "ton"
    ]
  }
];

/* ------------------------------------------------------------------ */
/*  Hard pools                                                        */
/* ------------------------------------------------------------------ */

const hardEntries: WordPoolEntry[] = [
  {
    rack: "pastel",
    difficulty: "hard",
    answers: [
      "pastel", "plates", "staple", "pleats", "petals", "palest", "septal", "tepals",
      "east", "last", "late", "leap", "lest", "pale", "past", "peal", "peat", "pelt", "pest", "plat", "plea", "sale", "salt", "seal", "seat", "slap", "step", "tale", "tape",
      "ale", "ape", "ate", "eat", "lap", "lea", "let", "pal", "pat", "pea", "pet", "sap", "sat", "sea", "set", "spa", "tap", "tea"
    ]
  },
  {
    rack: "stripe",
    difficulty: "hard",
    answers: [
      "stripe", "priest", "sprite", "tripes",
      "pest", "pier", "rest", "rise", "rite", "sire", "site", "spit", "step", "stir", "tier", "tire", "trip",
      "ire", "its", "per", "pet", "pie", "pit", "rep", "rip", "set", "sip", "sir", "sit", "tie", "tip"
    ]
  },
  {
    rack: "dorset",
    difficulty: "hard",
    answers: [
      "stored", "sorted", "doters",
      "dose", "dote", "rest", "rode", "rose", "rote", "sore", "sort", "toed", "tore", "trod",
      "doe", "dot", "ode", "ore", "red", "rod", "roe", "rot", "set", "sod", "sot", "toe"
    ]
  },
  {
    rack: "design",
    difficulty: "hard",
    answers: [
      "design", "signed", "singed",
      "deign", "singe",
      "dine", "send", "side", "sign", "sine", "sing",
      "den", "dig", "din", "end", "gin", "sin"
    ]
  },
  {
    rack: "nectar",
    difficulty: "hard",
    answers: [
      "nectar", "canter", "recant", "trance",
      "acre", "cane", "care", "cart", "earn", "near", "neat", "race", "rant", "rate", "rent", "tarn", "tear", "tern",
      "ace", "act", "ant", "arc", "are", "art", "ate", "can", "car", "cat", "ear", "eat", "era", "net", "ran", "rat", "tan", "tar", "tea", "ten"
    ]
  }
];

/* ------------------------------------------------------------------ */
/*  Build-time validation                                             */
/* ------------------------------------------------------------------ */

for (const e of [...easyEntries, ...hardEntries]) {
  assertEntry(e);
}

/* ------------------------------------------------------------------ */
/*  Exports                                                           */
/* ------------------------------------------------------------------ */

export const WORD_POOLS = {
  easy: easyEntries,
  hard: hardEntries
};

export const ROUND_SECONDS = 60;

function shuffleString(value: string): string {
  const chars = value.split("");
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

/** Sorted multiset key — same for any permutation of the six letters (e.g. hearts / taersh). */
export function rackMultisetKey(rack: string): string {
  return rack
    .slice(0, 6)
    .toLowerCase()
    .split("")
    .sort()
    .join("");
}

export function getRandomPoolEntry(options?: { excludeMultisetKey?: string }): WordPoolEntry {
  const difficulty: "easy" | "hard" = Math.random() > 0.5 ? "hard" : "easy";
  const pool = WORD_POOLS[difficulty];
  const exclude = options?.excludeMultisetKey;
  const candidates =
    exclude && exclude.length ? pool.filter((e) => rackMultisetKey(e.rack) !== exclude) : pool;
  const pickFrom = candidates.length ? candidates : pool;
  return pickFrom[Math.floor(Math.random() * pickFrom.length)];
}

export function randomizeRack(entry: WordPoolEntry): string {
  const cleanRack = entry.rack.slice(0, 6).toLowerCase();
  return shuffleString(cleanRack);
}

export function buildAnswerMap() {
  const map = new Map<string, Set<string>>();
  [...easyEntries, ...hardEntries].forEach((entry) => {
    const key = entry.rack.slice(0, 6).split("").sort().join("");
    if (!map.has(key)) {
      map.set(key, new Set());
    }
    entry.answers.forEach((answer) => {
      map.get(key)?.add(answer.toLowerCase());
    });
  });
  return map;
}

export const CURATED_ANSWERS = buildAnswerMap();
