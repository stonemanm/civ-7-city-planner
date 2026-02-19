import {
  useState,
  useCallback,
  useRef,
  useMemo,
  useReducer,
  useEffect,
} from "react";
import * as Hex from "./lib/hex_engine.js";
import {
  BUILDING_KEYS,
  FEATURE_KEYS,
  BIOME_KEYS,
  BUILDING_KEY_MAP,
  FEATURE_KEY_MAP,
  BIOME_KEY_MAP,
  BUILDINGS,
  FEATURES,
  BLOCKING_FEATURES,
  BIOMES,
} from "./lib/constants.js";

// ─── ADJACENCY ENGINE ─────────────────────────────────────────────────────────
const calcBuildingAdj = (type, neighborTiles) => {
  if (type === "warehouse") return 0;
  let bonus = 0;
  for (const n of neighborTiles) {
    if (!n) continue;
    const hasWonder = n.buildings.some((b) => b?.type === "wonder");
    if (type === "science" || type === "production") {
      if (n.features.includes("resource")) bonus++;
      if (hasWonder) bonus++;
    } else if (type === "food" || type === "gold") {
      if (n.features.includes("river")) bonus++;
      if (n.biome === "marine") bonus++;
      if (hasWonder) bonus++;
    } else if (type === "culture" || type === "happiness") {
      if (n.features.includes("mountain")) bonus++;
      if (n.features.includes("naturalWonder")) bonus++;
      if (hasWonder) bonus++;
    }
  }
  return bonus;
};

const calcPalaceAdj = (ns) =>
  ns.filter((n) => n && n.buildings.filter(Boolean).length >= 2).length;
const hasBuildingBlock = (tile) =>
  tile.features.some((f) => BLOCKING_FEATURES.has(f));

// ─── STATE ────────────────────────────────────────────────────────────────────
const createInitialGrid = () => {
  const g = {};
  Hex.ALL_HEXES.forEach(({ q, r }) => {
    g[Hex.hexKey(q, r)] = {
      q,
      r,
      biome: null,
      features: [],
      buildings: [null, null],
    };
  });
  g["0,0"].buildings[0] = { type: "palace" };
  return g;
};

function gridReducer(state, action) {
  const tile = state[action.key];
  switch (action.type) {
    case "PAINT_BIOME":
      if (!tile) return state;
      return { ...state, [action.key]: { ...tile, biome: action.value } };

    case "TOGGLE_FEATURE": {
      if (!tile) return state;
      const val = action.value;
      let feats = [...tile.features];
      if (BLOCKING_FEATURES.has(val)) {
        feats = feats.includes(val)
          ? feats.filter((f) => f !== val)
          : [...feats.filter((f) => !BLOCKING_FEATURES.has(f)), val];
      } else {
        feats = feats.includes(val)
          ? feats.filter((f) => f !== val)
          : [...feats, val];
      }
      return { ...state, [action.key]: { ...tile, features: feats } };
    }

    case "PLACE_BUILDING": {
      if (!tile || hasBuildingBlock(tile)) return state;
      const buildings = [...tile.buildings];
      buildings[action.slot] = action.value ? { type: action.value } : null;
      return { ...state, [action.key]: { ...tile, buildings } };
    }

    case "REMOVE_BUILDING": {
      if (!tile) return state;
      const buildings = [...tile.buildings];
      if (buildings[1] !== null) buildings[1] = null;
      else if (buildings[0]?.type !== "palace") buildings[0] = null;
      return { ...state, [action.key]: { ...tile, buildings } };
    }

    case "CLEAR_BIOME":
      if (!tile) return state;
      return { ...state, [action.key]: { ...tile, biome: null } };

    case "CLEAR_FEATURES":
      if (!tile) return state;
      return { ...state, [action.key]: { ...tile, features: [] } };

    case "CLEAR_ALL_BIOMES": {
      const ns = { ...state };
      Object.keys(ns).forEach((k) => {
        ns[k] = { ...ns[k], biome: null };
      });
      return ns;
    }

    case "CLEAR_ALL_FEATURES": {
      const ns = { ...state };
      Object.keys(ns).forEach((k) => {
        ns[k] = { ...ns[k], features: [] };
      });
      return ns;
    }

    case "CLEAR_BUILDINGS": {
      const ns = { ...state };
      Object.keys(ns).forEach((k) => {
        ns[k] = {
          ...ns[k],
          buildings: ns[k].buildings.map((b) =>
            b?.type === "palace" ? b : null,
          ),
        };
      });
      return ns;
    }

    case "RESET":
      return createInitialGrid();

    default:
      return state;
  }
}

// ─── CONFIRM MODAL ────────────────────────────────────────────────────────────
const ConfirmModal = ({ message, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-100 flex items-center justify-center">
    <div className="absolute inset-0 bg-black/75" onClick={onCancel} />
    <div className="relative z-10 bg-gray-900 border border-amber-800 rounded-xl shadow-2xl px-8 py-7 flex flex-col items-center gap-6 max-w-sm w-full mx-4">
      <div className="text-amber-300 text-base font-serif text-center leading-relaxed">
        {message}
      </div>
      <div className="flex gap-3 w-full">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 rounded border border-slate-600 bg-slate-800 text-slate-300 text-sm hover:bg-slate-700 transition-colors cursor-pointer font-serif"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-2.5 rounded border border-red-700 bg-red-950 text-red-300 text-sm hover:bg-red-900 transition-colors cursor-pointer font-serif"
        >
          Clear All
        </button>
      </div>
    </div>
  </div>
);

// ─── HEX TILE ─────────────────────────────────────────────────────────────────
const AdjBadge = ({ cx, cy, value, isPalace }) => {
  if (!value) return null;
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={9}
        fill={isPalace ? "#1a1500" : "#122010"}
        stroke={isPalace ? "#c8a020" : "#40c040"}
        strokeWidth={1.2}
      />
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={9}
        fill={isPalace ? "#f0c030" : "#40e040"}
        fontWeight="bold"
      >
        +{value}
      </text>
    </g>
  );
};

const HexTile = ({
  tile,
  cx,
  cy,
  adj,
  isCenter,
  onMouseDown,
  onMouseEnter,
  onContextMenu,
}) => {
  const { biome, features, buildings } = tile;
  const biomeDef = biome ? BIOMES[biome] : null;
  const fillColor = biomeDef?.color ?? "#0e1624";
  const strokeColor = biomeDef?.border ?? "#2a3a50";
  const isQuarter = buildings.filter(Boolean).length >= 2;
  const blocked = hasBuildingBlock(tile);
  const blockFeat = features.find((f) => BLOCKING_FEATURES.has(f));
  const hasRiver = features.includes("river");
  const slot0 = buildings[0],
    slot1 = buildings[1];
  const adj0 = adj[0] ?? 0,
    adj1 = adj[1] ?? 0;

  return (
    <g
      onMouseDown={(e) => {
        e.preventDefault();
        if (e.button === 2) onContextMenu();
        else onMouseDown();
      }}
      onMouseEnter={onMouseEnter}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu();
      }}
      style={{ cursor: "pointer" }}
    >
      <polygon
        points={Hex.hexVerticesStr(cx, cy)}
        fill={fillColor}
        stroke={isCenter ? "#c8a020" : isQuarter ? "#7a5fc0" : strokeColor}
        strokeWidth={isCenter ? 2.5 : isQuarter ? 2 : 1.2}
      />

      {hasRiver && (
        <>
          <polygon
            points={Hex.hexVerticesStr(cx, cy)}
            fill="url(#riverPattern)"
            style={{ pointerEvents: "none" }}
          />
          <polygon
            points={Hex.hexVerticesStr(cx, cy)}
            fill="none"
            stroke="#4ab0e0"
            strokeWidth={3}
            opacity={0.5}
            style={{ pointerEvents: "none" }}
          />
        </>
      )}

      {isQuarter && !isCenter && (
        <polygon
          points={Hex.hexVerticesStr(cx, cy, Hex.HEX_SIZE - 3)}
          fill="none"
          stroke="#7a5fc066"
          strokeWidth={1}
          strokeDasharray="4,3"
          style={{ pointerEvents: "none" }}
        />
      )}
      {isCenter && (
        <polygon
          points={Hex.hexVerticesStr(cx, cy, Hex.HEX_SIZE - 5)}
          fill="none"
          stroke="#c8a02044"
          strokeWidth={1}
          style={{ pointerEvents: "none" }}
        />
      )}

      {blockFeat && (
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={30}
          fill={FEATURES[blockFeat].color}
          style={{
            pointerEvents: "none",
            filter: `drop-shadow(0 0 4px ${FEATURES[blockFeat].color}88)`,
          }}
        >
          {FEATURES[blockFeat].icon}
        </text>
      )}

      {!blocked && slot0 && (
        <g style={{ pointerEvents: "none" }}>
          {!slot1 ? (
            <>
              <text
                x={cx}
                y={cy}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={24}
                fill={
                  slot0.type === "palace"
                    ? "#f8d060"
                    : BUILDINGS[slot0.type]?.color
                }
                style={{
                  filter:
                    slot0.type === "palace"
                      ? "drop-shadow(0 0 4px #f8d060aa)"
                      : `drop-shadow(0 0 3px ${BUILDINGS[slot0.type]?.color}88)`,
                }}
              >
                {slot0.type === "palace" ? "★" : BUILDINGS[slot0.type]?.icon}
              </text>
              <AdjBadge
                cx={cx + 15}
                cy={cy - 15}
                value={adj0}
                isPalace={slot0.type === "palace"}
              />
            </>
          ) : (
            <>
              <text
                x={cx}
                y={cy - 13}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={18}
                fill={
                  slot0.type === "palace"
                    ? "#f8d060"
                    : BUILDINGS[slot0.type]?.color
                }
                style={{
                  filter:
                    slot0.type === "palace"
                      ? "drop-shadow(0 0 3px #f8d06088)"
                      : `drop-shadow(0 0 2px ${BUILDINGS[slot0.type]?.color}88)`,
                }}
              >
                {slot0.type === "palace" ? "★" : BUILDINGS[slot0.type]?.icon}
              </text>
              <text
                x={cx}
                y={cy + 13}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={18}
                fill={BUILDINGS[slot1.type]?.color}
                style={{
                  filter: `drop-shadow(0 0 2px ${BUILDINGS[slot1.type]?.color}88)`,
                }}
              >
                {BUILDINGS[slot1.type]?.icon}
              </text>
              <AdjBadge
                cx={cx + 17}
                cy={cy - 21}
                value={adj0}
                isPalace={slot0.type === "palace"}
              />
              <AdjBadge
                cx={cx + 17}
                cy={cy + 5}
                value={adj1}
                isPalace={false}
              />
            </>
          )}
        </g>
      )}

      {isCenter && (
        <text
          x={cx}
          y={cy + Hex.HEX_SIZE - 9}
          textAnchor="middle"
          fontSize={7}
          fill="#c8a02066"
          letterSpacing={1}
          style={{ pointerEvents: "none" }}
        >
          CITY
        </text>
      )}
    </g>
  );
};

// ─── TOOL BUTTON (single column) ─────────────────────────────────────────────
const ToolBtn = ({
  selected,
  onClick,
  icon,
  iconColor,
  label,
  hotkey,
  swatch,
}) => (
  <button
    onClick={onClick}
    className={[
      "w-full flex items-center gap-3 rounded px-3 py-2.5 border text-left",
      "transition-all duration-100 cursor-pointer",
      selected
        ? "bg-amber-500 border-amber-300 text-gray-900 shadow-[0_0_8px_rgba(200,160,32,0.4)]"
        : "bg-slate-900 border-slate-700 text-amber-100/80 hover:border-slate-500 hover:bg-slate-800",
    ].join(" ")}
  >
    <span className="shrink-0 w-6 flex items-center justify-center">
      {swatch ? (
        <span
          className="inline-block w-4 h-4 rounded-sm border"
          style={{ background: swatch.color, borderColor: swatch.border }}
        />
      ) : (
        <span
          className="text-xl leading-none"
          style={{
            color: selected ? "#1a0a00" : iconColor,
            filter: selected ? "none" : `drop-shadow(0 0 3px ${iconColor}66)`,
          }}
        >
          {icon}
        </span>
      )}
    </span>
    <span className="flex-1 text-sm font-serif leading-tight">{label}</span>
    <span
      className={[
        "shrink-0 text-xs font-mono px-1.5 py-0.5 rounded border min-w-6 text-center",
        selected
          ? "bg-amber-600/40 border-amber-700/50 text-amber-900"
          : "bg-slate-800 border-slate-600 text-slate-400",
      ].join(" ")}
    >
      {hotkey}
    </span>
  </button>
);

const SectionHeader = ({ children }) => (
  <div className="text-xs tracking-[0.18em] text-amber-500 uppercase border-b border-slate-700 pb-1 mb-2 mt-4 first:mt-0">
    {children}
  </div>
);

const ClearAllBtn = ({ onClick }) => (
  <button
    onClick={onClick}
    className="w-full mt-1.5 text-xs text-slate-500 hover:text-red-400 border border-slate-800 hover:border-red-900 bg-transparent rounded py-1.5 transition-colors cursor-pointer font-serif tracking-wide"
  >
    Clear all ↺
  </button>
);

// ─── LEFT SIDEBAR ─────────────────────────────────────────────────────────────
const LeftSidebar = ({
  selectedTool,
  onSelectTool,
  onRequestClear,
  onReset,
}) => {
  const isSel = (type, value) =>
    selectedTool.type === type && selectedTool.value === value;
  return (
    <div className="h-full flex flex-col p-3 overflow-y-auto bg-gray-950 font-serif">
      <div className="text-center pb-3 mb-1 border-b border-slate-800">
        <div className="text-amber-500 font-bold tracking-widest text-base">
          CITY PLANNER
        </div>
        <div className="text-slate-500 text-[10px] tracking-widest mt-0.5">
          HEX LAYOUT TOOL
        </div>
      </div>

      <SectionHeader>Buildings</SectionHeader>
      <div className="flex flex-col gap-1">
        {Object.entries(BUILDINGS).map(([key, b]) => (
          <ToolBtn
            key={key}
            selected={isSel("building", key)}
            onClick={() => onSelectTool("building", key)}
            icon={b.icon}
            iconColor={b.color}
            label={b.label}
            hotkey={BUILDING_KEY_MAP[key]}
          />
        ))}
      </div>
      <ClearAllBtn onClick={() => onRequestClear("buildings")} />

      <SectionHeader>Features</SectionHeader>
      <div className="flex flex-col gap-1">
        {Object.entries(FEATURES).map(([key, f]) => (
          <ToolBtn
            key={key}
            selected={isSel("feature", key)}
            onClick={() => onSelectTool("feature", key)}
            icon={f.icon}
            iconColor={f.color}
            label={f.label}
            hotkey={FEATURE_KEY_MAP[key]}
          />
        ))}
      </div>
      <ClearAllBtn onClick={() => onRequestClear("features")} />

      <SectionHeader>Biomes</SectionHeader>
      <div className="flex flex-col gap-1">
        {Object.entries(BIOMES).map(([key, b]) => (
          <ToolBtn
            key={key}
            selected={isSel("biome", key)}
            onClick={() => onSelectTool("biome", key)}
            swatch={{ color: b.color, border: b.border }}
            label={b.label}
            hotkey={BIOME_KEY_MAP[key]}
          />
        ))}
      </div>
      <ClearAllBtn onClick={() => onRequestClear("biomes")} />

      <div className="mt-auto pt-3 border-t border-slate-800">
        <button
          onClick={onReset}
          className="w-full bg-slate-900 border border-red-900 text-red-400 rounded py-2 text-sm tracking-wide cursor-pointer hover:bg-red-950 transition-colors font-serif"
        >
          ↺ Reset Planner
        </button>
      </div>
    </div>
  );
};

// ─── RIGHT SIDEBAR ────────────────────────────────────────────────────────────
const RightSidebar = () => (
  <div className="h-full flex flex-col p-3 overflow-y-auto bg-gray-950 font-serif">
    <SectionHeader>How to Paint</SectionHeader>
    <div className="text-sm text-slate-400 leading-relaxed space-y-2.5">
      <p>
        Select a tool on the left, then click or drag across tiles to apply it.
      </p>
      <p>
        Left-click applies the tool. Right-click removes that tool's layer from
        a tile.
      </p>
      <p>Use the hotkeys shown on each button to quickly switch tools.</p>
    </div>

    <SectionHeader>Adjacency Bonuses</SectionHeader>
    <div className="text-sm text-slate-400 space-y-3">
      <div>
        <div>
          <span style={{ color: "#f8d060" }}>★ Palace</span>
        </div>
        <div className="text-slate-500 pl-2 text-xs leading-relaxed mt-0.5">
          +1 per adjacent Quarter (tile with 2 buildings)
        </div>
      </div>
      <div>
        <div>
          <span style={{ color: "#9b59b6" }}>♪ Culture</span>
          {" / "}
          <span style={{ color: "#e67e22" }}>☺ Happiness</span>
        </div>
        <div className="text-slate-500 pl-2 text-xs leading-relaxed mt-0.5">
          +1 per Mountain, Natural Wonder tile, or Wonder building
        </div>
      </div>
      <div>
        <div>
          <span style={{ color: "#27ae60" }}>✿ Food</span>
          {" / "}
          <span style={{ color: "#f1c40f" }}>◉ Gold</span>
        </div>
        <div className="text-slate-500 pl-2 text-xs leading-relaxed mt-0.5">
          +1 per Navigable River, Marine biome, or Wonder building
        </div>
      </div>
      <div>
        <div>
          <span style={{ color: "#2eaff5" }}>⚗︎ Science</span>
          {" / "}
          <span style={{ color: "#95a5a6" }}>⚒ Production</span>
        </div>
        <div className="text-slate-500 pl-2 text-xs leading-relaxed mt-0.5">
          +1 per adjacent Resource tile or Wonder building
        </div>
      </div>
    </div>

    <SectionHeader>Tile Legend</SectionHeader>
    <div className="text-sm text-slate-400 space-y-3">
      {/* Quarter */}
      <div className="flex items-start gap-3">
        <svg width="22" height="22" className="shrink-0 mt-0.5">
          <polygon
            points={Hex.hexVerticesStr(11, 11, 10)}
            fill="none"
            stroke="#7a5fc0"
            strokeWidth={1.5}
            strokeDasharray="3,2"
          />
        </svg>
        <span>Quarter — tile with 2 buildings (purple dashed ring)</span>
      </div>
      {/* Navigable River — accurate mini hex showing stripe + blue border */}
      <div className="flex items-start gap-3">
        <svg width="22" height="22" className="shrink-0 mt-0.5">
          <defs>
            <pattern
              id="legendRiver"
              patternUnits="userSpaceOnUse"
              width="6"
              height="6"
              patternTransform="rotate(45)"
            >
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="6"
                stroke="#4ab0e0"
                strokeWidth="2"
                opacity="0.5"
              />
            </pattern>
            <clipPath id="legendHexClip">
              <polygon points={Hex.hexVerticesStr(11, 11, 10)} />
            </clipPath>
          </defs>
          <polygon points={Hex.hexVerticesStr(11, 11, 10)} fill="#1a3d6e" />
          <rect
            x="0"
            y="0"
            width="22"
            height="22"
            fill="url(#legendRiver)"
            clipPath="url(#legendHexClip)"
          />
          <polygon
            points={Hex.hexVerticesStr(11, 11, 10)}
            fill="none"
            stroke="#4ab0e0"
            strokeWidth={2.5}
            opacity={0.7}
          />
        </svg>
        <span>Navigable River — diagonal stripe with blue border</span>
      </div>
      {/* City limits */}
      <div className="flex items-start gap-3">
        <svg width="22" height="22" className="shrink-0 mt-0.5">
          <line
            x1="3"
            y1="19"
            x2="19"
            y2="3"
            stroke="#7a5020"
            strokeWidth={3.5}
            strokeLinecap="round"
          />
        </svg>
        <span>City limits boundary (between rings 3 and 4)</span>
      </div>
    </div>
  </div>
);

// ─── HAMBURGER ────────────────────────────────────────────────────────────────
const HamburgerIcon = ({ open }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
  >
    {open ? (
      <>
        <line x1="4" y1="4" x2="16" y2="16" />
        <line x1="16" y1="4" x2="4" y2="16" />
      </>
    ) : (
      <>
        <line x1="3" y1="6" x2="17" y2="6" />
        <line x1="3" y1="10" x2="17" y2="10" />
        <line x1="3" y1="14" x2="17" y2="14" />
      </>
    )}
  </svg>
);

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function CityPlanner() {
  const [grid, dispatch] = useReducer(gridReducer, null, createInitialGrid);
  const [selectedTool, setSelectedTool] = useState({ type: null, value: null });
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);
  const isPainting = useRef(false);
  const paintedKeys = useRef(new Set());

  // ── Keyboard hotkeys ──────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")
        return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (BIOME_KEYS[k]) {
        const val = BIOME_KEYS[k];
        setSelectedTool((prev) =>
          prev.type === "biome" && prev.value === val
            ? prev
            : { type: "biome", value: val },
        );
      } else if (FEATURE_KEYS[k]) {
        const val = FEATURE_KEYS[k];
        setSelectedTool((prev) =>
          prev.type === "feature" && prev.value === val
            ? prev
            : { type: "feature", value: val },
        );
      } else if (BUILDING_KEYS[k]) {
        const val = BUILDING_KEYS[k];
        setSelectedTool((prev) =>
          prev.type === "building" && prev.value === val
            ? prev
            : { type: "building", value: val },
        );
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close mobile drawers on resize to desktop
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const handler = (e) => {
      if (e.matches) {
        setLeftOpen(false);
        setRightOpen(false);
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // ── Adjacency ─────────────────────────────────────────────────────────────
  const adjacencyMap = useMemo(() => {
    const result = {};
    Hex.ALL_HEXES.forEach(({ q, r }) => {
      const key = Hex.hexKey(q, r);
      const tile = grid[key];
      if (!tile) return;
      const neighbors = Hex.getNeighborKeys(q, r).map((k) => grid[k] ?? null);
      const tileAdj = {};
      tile.buildings.forEach((b, idx) => {
        if (!b) return;
        tileAdj[idx] =
          b.type === "palace"
            ? calcPalaceAdj(neighbors)
            : calcBuildingAdj(b.type, neighbors);
      });
      result[key] = tileAdj;
    });
    return result;
  }, [grid]);

  // ── Tool application ──────────────────────────────────────────────────────
  const handleSelectTool = useCallback((type, value) => {
    setSelectedTool((prev) =>
      prev.type === type && prev.value === value
        ? { type: null, value: null }
        : { type, value },
    );
  }, []);

  const applyTool = useCallback(
    (key, isFirst = false) => {
      if (!selectedTool.type) return;
      if (
        !isFirst &&
        selectedTool.type === "feature" &&
        paintedKeys.current.has(key)
      )
        return;
      paintedKeys.current.add(key);
      if (selectedTool.type === "biome") {
        dispatch({ type: "PAINT_BIOME", key, value: selectedTool.value });
      } else if (selectedTool.type === "feature") {
        dispatch({ type: "TOGGLE_FEATURE", key, value: selectedTool.value });
      } else if (selectedTool.type === "building") {
        const tile = grid[key];
        if (!tile || hasBuildingBlock(tile)) return;
        if (tile.buildings[0]?.type === "palace") {
          if (!tile.buildings[1])
            dispatch({
              type: "PLACE_BUILDING",
              key,
              slot: 1,
              value: selectedTool.value,
            });
        } else {
          if (!tile.buildings[0])
            dispatch({
              type: "PLACE_BUILDING",
              key,
              slot: 0,
              value: selectedTool.value,
            });
          else if (!tile.buildings[1])
            dispatch({
              type: "PLACE_BUILDING",
              key,
              slot: 1,
              value: selectedTool.value,
            });
        }
      }
    },
    [selectedTool, grid],
  );

  const applyErase = useCallback(
    (key) => {
      if (selectedTool.type === "biome") dispatch({ type: "CLEAR_BIOME", key });
      else if (selectedTool.type === "feature")
        dispatch({ type: "CLEAR_FEATURES", key });
      else dispatch({ type: "REMOVE_BUILDING", key });
    },
    [selectedTool],
  );

  const handleMouseDown = useCallback(
    (key) => {
      isPainting.current = true;
      paintedKeys.current = new Set();
      applyTool(key, true);
    },
    [applyTool],
  );
  const handleMouseEnter = useCallback(
    (key) => {
      if (isPainting.current) applyTool(key);
    },
    [applyTool],
  );
  const handleMouseUp = useCallback(() => {
    isPainting.current = false;
    paintedKeys.current = new Set();
  }, []);

  // ── Clear-all confirmation ────────────────────────────────────────────────
  const handleRequestClear = useCallback((section) => {
    const cfg = {
      biomes: {
        message: "Clear all biomes from every tile?",
        actionType: "CLEAR_ALL_BIOMES",
      },
      features: {
        message: "Clear all features from every tile?",
        actionType: "CLEAR_ALL_FEATURES",
      },
      buildings: {
        message: "Remove all buildings (except the Palace)?",
        actionType: "CLEAR_BUILDINGS",
      },
    };
    setConfirmModal(cfg[section]);
  }, []);

  const handleConfirm = useCallback(() => {
    if (confirmModal) dispatch({ type: confirmModal.actionType });
    setConfirmModal(null);
  }, [confirmModal]);

  const SIDEBAR_W = "w-64";

  return (
    <div
      className="flex flex-row h-screen overflow-hidden bg-gray-950 text-amber-100 select-none"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* LEFT SIDEBAR — desktop */}
      <div
        className={`hidden md:flex flex-col shrink-0 ${SIDEBAR_W} border-r border-slate-800 overflow-hidden`}
      >
        <LeftSidebar
          selectedTool={selectedTool}
          onSelectTool={handleSelectTool}
          onRequestClear={handleRequestClear}
          onReset={() =>
            setConfirmModal({
              message:
                "Reset the entire planner? All terrain and buildings will be lost.",
              actionType: "RESET",
            })
          }
        />
      </div>

      {/* LEFT SIDEBAR — mobile drawer */}
      {leftOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setLeftOpen(false)}
        />
      )}
      <div
        className={[
          "fixed inset-y-0 left-0 z-50 md:hidden flex flex-col bg-gray-950",
          SIDEBAR_W,
          "border-r border-slate-800 transform transition-transform duration-200 ease-out",
          leftOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <LeftSidebar
          selectedTool={selectedTool}
          onSelectTool={(t, v) => {
            handleSelectTool(t, v);
            setLeftOpen(false);
          }}
          onRequestClear={(s) => {
            handleRequestClear(s);
            setLeftOpen(false);
          }}
          onReset={() => {
            setConfirmModal({
              message: "Reset the entire planner?",
              actionType: "RESET",
            });
            setLeftOpen(false);
          }}
        />
      </div>

      {/* CENTER CANVAS */}
      <div
        className="flex-1 relative flex items-center justify-center overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse at center, #0d1a2e 0%, #060c14 100%)",
        }}
      >
        <button
          onClick={() => {
            setLeftOpen((v) => !v);
            setRightOpen(false);
          }}
          className="absolute top-3 left-3 z-30 md:hidden bg-gray-900 border border-slate-700 text-amber-400 rounded p-1.5"
        >
          <HamburgerIcon open={leftOpen} />
        </button>
        <button
          onClick={() => {
            setRightOpen((v) => !v);
            setLeftOpen(false);
          }}
          className="absolute top-3 right-3 z-30 md:hidden bg-gray-900 border border-slate-700 text-amber-400 rounded p-1.5"
        >
          <HamburgerIcon open={rightOpen} />
        </button>

        <svg
          viewBox={`0 0 ${Hex.SVG_W} ${Hex.SVG_H}`}
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full block"
          style={{ cursor: selectedTool.type ? "crosshair" : "default" }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <defs>
            <pattern
              id="riverPattern"
              patternUnits="userSpaceOnUse"
              width="10"
              height="10"
              patternTransform="rotate(45)"
            >
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="10"
                stroke="#4ab0e0"
                strokeWidth="2.5"
                opacity="0.22"
              />
            </pattern>
            <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#c8a02020" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>
          <ellipse
            cx={Hex.hexToPixel(0, 0).x + Hex.SVG_OFF_X}
            cy={Hex.hexToPixel(0, 0).y + Hex.SVG_OFF_Y}
            rx={Hex.HEX_SIZE * 3.2}
            ry={Hex.HEX_SIZE * 3.2}
            fill="url(#centerGlow)"
            style={{ pointerEvents: "none" }}
          />
          {Hex.ALL_HEXES.map(({ q, r }) => {
            const key = Hex.hexKey(q, r);
            const tile = grid[key];
            if (!tile) return null;
            const { x, y } = Hex.hexToPixel(q, r);
            return (
              <HexTile
                key={key}
                tile={tile}
                cx={x + Hex.SVG_OFF_X}
                cy={y + Hex.SVG_OFF_Y}
                adj={adjacencyMap[key] ?? {}}
                isCenter={q === 0 && r === 0}
                onMouseDown={() => handleMouseDown(key)}
                onMouseEnter={() => handleMouseEnter(key)}
                onContextMenu={() => applyErase(key)}
              />
            );
          })}
          {Hex.BOUNDARY_EDGES.map(({ x1, y1, x2, y2, id }) => (
            <line
              key={id}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#7a5020"
              strokeWidth={3.5}
              strokeLinecap="round"
              opacity={0.9}
              style={{ pointerEvents: "none" }}
            />
          ))}
        </svg>
      </div>

      {/* RIGHT SIDEBAR — desktop */}
      <div
        className={`hidden md:flex flex-col shrink-0 ${SIDEBAR_W} border-l border-slate-800 overflow-hidden`}
      >
        <RightSidebar />
      </div>

      {/* RIGHT SIDEBAR — mobile drawer */}
      {rightOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setRightOpen(false)}
        />
      )}
      <div
        className={[
          "fixed inset-y-0 right-0 z-50 md:hidden flex flex-col bg-gray-950",
          SIDEBAR_W,
          "border-l border-slate-800 transform transition-transform duration-200 ease-out",
          rightOpen ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        <RightSidebar />
      </div>

      {/* CONFIRM MODAL */}
      {confirmModal && (
        <ConfirmModal
          message={confirmModal.message}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
}
