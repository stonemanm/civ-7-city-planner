// lib/constants.js

// HOTKEY BINDINGS

export const BUILDING_KEYS = {
  q: "culture",
  w: "happiness",
  e: "food",
  r: "gold",
  t: "science",
  y: "production",
  u: "warehouse",
  i: "wonder",
};

export const FEATURE_KEYS = {
  a: "mountain",
  s: "naturalWonder",
  d: "resource",
  f: "river",
};

export const BIOME_KEYS = {
  z: "grassland",
  x: "plains",
  c: "tundra",
  v: "desert",
  b: "tropical",
  n: "marine",
};

export const BUILDING_KEY_MAP = Object.fromEntries(
  Object.entries(BUILDING_KEYS).map(([k, v]) => [v, k]),
);
export const FEATURE_KEY_MAP = Object.fromEntries(
  Object.entries(FEATURE_KEYS).map(([k, v]) => [v, k]),
);
export const BIOME_KEY_MAP = Object.fromEntries(
  Object.entries(BIOME_KEYS).map(([k, v]) => [v, k]),
);

// TYPES

export const BUILDINGS = {
  culture: { label: "Culture", color: "#9b59b6", icon: "♪" },
  happiness: { label: "Happiness", color: "#e67e22", icon: "☺" },
  food: { label: "Food", color: "#27ae60", icon: "✿" },
  gold: { label: "Gold", color: "#f1c40f", icon: "◉" },
  science: { label: "Science", color: "#2eaff5", icon: "⚗︎" },
  production: { label: "Production", color: "#95a5a6", icon: "⚒" },
  warehouse: { label: "Warehouse", color: "#888888", icon: "▣" },
  wonder: { label: "Wonder", color: "#e74c3c", icon: "⛩" },
};

export const FEATURES = {
  mountain: { label: "Mountain", icon: "⛰", color: "#c8b090", blocking: true },
  naturalWonder: {
    label: "Natural Wonder",
    icon: "✦",
    color: "#e060d0",
    blocking: true,
  },
  resource: { label: "Resource", icon: "◆", color: "#f0d050", blocking: true },
  river: {
    label: "Navigable River",
    icon: "≋",
    color: "#4ab0e0",
    blocking: false,
  },
};

export const BLOCKING_FEATURES = new Set([
  "mountain",
  "resource",
  "naturalWonder",
]);

export const BIOMES = {
  grassland: { label: "Grassland", color: "#3d6e31", border: "#4d8a3e" },
  plains: { label: "Plains", color: "#8a7428", border: "#a8913a" },
  tundra: { label: "Tundra", color: "#8ea8b8", border: "#a8c4d4" },
  desert: { label: "Desert", color: "#9e7e48", border: "#c09a5a" },
  tropical: { label: "Tropical", color: "#1e5a2e", border: "#276b38" },
  marine: { label: "Marine", color: "#1a3d6e", border: "#1e4a8a" },
};
