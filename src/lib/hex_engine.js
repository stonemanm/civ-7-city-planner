// lib/hexEngine.js

export const HEX_SIZE = 46;
export const RINGS = 4;
export const SQRT3 = Math.sqrt(3);

export const hexToPixel = (q, r) => ({
  x: HEX_SIZE * (SQRT3 * q + (SQRT3 / 2) * r),
  y: HEX_SIZE * 1.5 * r,
});

export const hexKey = (q, r) => `${q},${r}`;
export const hexRing = (q, r) =>
  Math.max(Math.abs(q), Math.abs(r), Math.abs(-q - r));

export const hexVertex = (cx, cy, i, size = HEX_SIZE) => {
  const a = (Math.PI / 3) * i + Math.PI / 6;
  return [cx + size * Math.cos(a), cy + size * Math.sin(a)];
};

export const hexVerticesStr = (cx, cy, size = HEX_SIZE) =>
  Array.from({ length: 6 }, (_, i) =>
    hexVertex(cx, cy, i, size).join(","),
  ).join(" ");

export const AX_DIRS = [
  [1, 0],
  [1, -1],
  [0, -1],
  [-1, 0],
  [-1, 1],
  [0, 1],
];

export const getNeighborKeys = (q, r) =>
  AX_DIRS.map(([dq, dr]) => hexKey(q + dq, r + dr));

export const generateGrid = (rings) => {
  const hexes = [];
  for (let q = -rings; q <= rings; q++) {
    const r1 = Math.max(-rings, -q - rings);
    const r2 = Math.min(rings, -q + rings);
    for (let r = r1; r <= r2; r++) hexes.push({ q, r });
  }
  return hexes;
};

export const ALL_HEXES = generateGrid(RINGS);

// Calculate SVG bounding box
const _px = ALL_HEXES.map(({ q, r }) => hexToPixel(q, r));
export const SVG_PAD = HEX_SIZE + 12;
export const SVG_OFF_X = -Math.min(..._px.map((p) => p.x)) + SVG_PAD;
export const SVG_OFF_Y = -Math.min(..._px.map((p) => p.y)) + SVG_PAD;
export const SVG_W = Math.max(..._px.map((p) => p.x)) + SVG_OFF_X + SVG_PAD;
export const SVG_H = Math.max(..._px.map((p) => p.y)) + SVG_OFF_Y + SVG_PAD;

// City-limits boundary: edges of ring-3 hexes facing ring-4 neighbours.
export const BOUNDARY_EDGES = (() => {
  const edges = [];
  ALL_HEXES.forEach(({ q, r }) => {
    if (hexRing(q, r) !== 3) return;
    const { x, y } = hexToPixel(q, r);
    const cx = x + SVG_OFF_X,
      cy = y + SVG_OFF_Y;
    AX_DIRS.forEach(([dq, dr], i) => {
      if (hexRing(q + dq, r + dr) === 4) {
        const [x1, y1] = hexVertex(cx, cy, (5 - i + 6) % 6);
        const [x2, y2] = hexVertex(cx, cy, (6 - i + 6) % 6);
        edges.push({ x1, y1, x2, y2, id: `${q},${r},${i}` });
      }
    });
  });
  return edges;
})();
