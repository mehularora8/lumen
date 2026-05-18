import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { ENTITIES, PLAYER_START, ROADS, ROOM_COLS, ROOM_ROWS } from './data/town.js';
import {
  addLeaderboardEntry,
  loadCompleted,
  loadLeaderboard,
  saveCompleted,
} from './storage.js';

const MOVE_KEYS = {
  ArrowUp: { dx: 0, dy: -1, facing: 'up' },
  ArrowDown: { dx: 0, dy: 1, facing: 'down' },
  ArrowLeft: { dx: -1, dy: 0, facing: 'left' },
  ArrowRight: { dx: 1, dy: 0, facing: 'right' },
  w: { dx: 0, dy: -1, facing: 'up' },
  s: { dx: 0, dy: 1, facing: 'down' },
  a: { dx: -1, dy: 0, facing: 'left' },
  d: { dx: 1, dy: 0, facing: 'right' },
};

// Side HUD panel width — reserved on each side of the room.
const SIDE_PANEL_WIDTH = 200;

// --- reducer ----------------------------------------------------------------

const initialState = (already) => ({
  phase: 'entrance',
  player: { ...PLAYER_START, step: 0 },
  unlocked: [],
  inventory: {},
  activeItemId: null,
  startTime: null,
  elapsedMs: 0,
  hasPlayedBefore: already,
});

function invCount(inv, id) {
  return inv?.[id] || 0;
}

function invAdd(inv, id, n) {
  if (!id || !n) return inv;
  return { ...inv, [id]: (inv[id] || 0) + n };
}

function invRemove(inv, id, n) {
  if (!id || !n) return inv;
  const cur = inv[id] || 0;
  const next = Math.max(0, cur - n);
  const { [id]: _removed, ...rest } = inv;
  return next === 0 ? rest : { ...inv, [id]: next };
}

function reducer(state, action) {
  switch (action.type) {
    case 'enter-room':
      return { ...state, phase: 'playing', startTime: Date.now() };
    case 'move': {
      if (state.phase !== 'playing' || state.activeItemId) return state;
      const { dx, dy, facing } = action;
      const nx = state.player.x + dx;
      const ny = state.player.y + dy;
      const nextStep = 1 - (state.player.step || 0);
      if (nx < 0 || ny < 0 || nx >= ROOM_COLS || ny >= ROOM_ROWS) {
        return { ...state, player: { ...state.player, facing } };
      }
      if (isTileBlocked(nx, ny)) {
        return { ...state, player: { ...state.player, facing } };
      }
      return { ...state, player: { x: nx, y: ny, facing, step: nextStep } };
    }
    case 'open-item':
      return { ...state, activeItemId: action.id };
    case 'close-item':
      return { ...state, activeItemId: null };
    case 'unlock-item': {
      let unlocked = state.unlocked;
      if (!action.repeatable && !unlocked.includes(action.id)) {
        unlocked = [...unlocked, action.id];
      }
      let inventory = state.inventory;
      if (action.consumeItem) {
        inventory = invRemove(inventory, action.consumeItem, action.consumeCount || 1);
      }
      if (action.rewardItem) {
        inventory = invAdd(inventory, action.rewardItem, action.rewardCount || 1);
      }
      return { ...state, unlocked, inventory };
    }
    case 'win':
      return {
        ...state,
        phase: 'won',
        activeItemId: null,
        elapsedMs: state.startTime ? Date.now() - state.startTime : 0,
      };
    case 'restart':
      return initialState(true);
    default:
      return state;
  }
}

// --- helpers ----------------------------------------------------------------

function entityFootprint(entity) {
  const w = entity.width || 1;
  const h = entity.height || 1;
  const tiles = [];
  for (let dx = 0; dx < w; dx++) {
    for (let dy = 0; dy < h; dy++) {
      tiles.push({ x: entity.x + dx, y: entity.y + dy });
    }
  }
  return tiles;
}

function isTileBlocked(x, y) {
  return ENTITIES.some((e) =>
    entityFootprint(e).some((t) => t.x === x && t.y === y),
  );
}

function isPlayerAdjacent(player, entity) {
  return entityFootprint(entity).some(
    (t) => Math.abs(player.x - t.x) + Math.abs(player.y - t.y) === 1,
  );
}

function findAdjacentInteractable(player) {
  return ENTITIES.find((e) => e.interaction && isPlayerAdjacent(player, e));
}

function formatTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function useTileSize(cols, rows) {
  const [tile, setTile] = useState(56);
  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth - 2 * SIDE_PANEL_WIDTH;
      const h = window.innerHeight;
      const t = Math.max(40, Math.floor(Math.min(w / cols, h / rows)));
      setTile(t);
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [cols, rows]);
  return tile;
}

// --- App --------------------------------------------------------------------

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState(loadCompleted()));
  const [now, setNow] = useState(Date.now());
  const [overlay, setOverlay] = useState(null); // 'leaderboard' | 'about' | null
  const tile = useTileSize(ROOM_COLS, ROOM_ROWS);

  useEffect(() => {
    const t = setTimeout(() => dispatch({ type: 'enter-room' }), 1400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (state.phase !== 'playing') return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [state.phase]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape' && overlay) {
        setOverlay(null);
        return;
      }
      if (state.phase !== 'playing') return;
      if (state.activeItemId || overlay) return;
      const move = MOVE_KEYS[e.key];
      if (move) {
        e.preventDefault();
        dispatch({ type: 'move', ...move });
        return;
      }
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        const target = findAdjacentInteractable(state.player);
        if (target) dispatch({ type: 'open-item', id: target.id });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [state.phase, state.player, state.activeItemId, overlay]);

  const activeEntity = useMemo(
    () => ENTITIES.find((e) => e.id === state.activeItemId) || null,
    [state.activeItemId],
  );

  const elapsedMs = state.phase === 'playing' && state.startTime
    ? now - state.startTime
    : state.elapsedMs;

  const handleDialogResolve = (result) => {
    if (!activeEntity) return;
    const inter = activeEntity.interaction || {};
    if (result?.kind === 'unlock') {
      dispatch({
        type: 'unlock-item',
        id: activeEntity.id,
        rewardItem: inter.rewardItem,
        rewardCount: inter.rewardCount || 1,
        consumeItem: inter.kind === 'trade' ? inter.requiresItem : null,
        consumeCount: inter.kind === 'trade' ? (inter.requiresCount || 1) : 0,
        repeatable: inter.repeatable,
      });
      if (result.keepOpen) return;
    }
    if (result?.kind === 'win') {
      saveCompleted(true);
      dispatch({ type: 'win' });
      return;
    }
    dispatch({ type: 'close-item' });
  };

  return (
    <Cabinet>
      {state.phase === 'won' ? (
        <WinScreen
          elapsedMs={state.elapsedMs}
          onRestart={() => dispatch({ type: 'restart' })}
        />
      ) : (
        <>
          <LeftPanel elapsedMs={elapsedMs} inventory={state.inventory} />
          <Room state={state} tile={tile} />
          <RightPanel onOpenOverlay={setOverlay} />
        </>
      )}

      {activeEntity && (
        <Dialog entity={activeEntity} state={state} onResolve={handleDialogResolve} />
      )}

      {overlay === 'leaderboard' && <LeaderboardOverlay onClose={() => setOverlay(null)} />}
      {overlay === 'about' && <AboutOverlay onClose={() => setOverlay(null)} />}
    </Cabinet>
  );
}

// --- cabinet shell ----------------------------------------------------------

function Cabinet({ children }) {
  return (
    <div className="fixed inset-0 overflow-hidden crt bg-arcade-bg flex flex-row">
      {children}
    </div>
  );
}

// --- HUD --------------------------------------------------------------------

function LeftPanel({ elapsedMs, inventory }) {
  return (
    <aside
      className="shrink-0 bg-arcade-dark flex flex-col gap-6 p-5 text-[10px]"
      style={{ width: SIDE_PANEL_WIDTH }}
    >
      <PanelSection title="TIME">
        <div className="text-arcade-yellow text-base" style={{ fontFamily: 'VT323, monospace', fontSize: 32, lineHeight: 1 }}>
          {formatTime(elapsedMs)}
        </div>
      </PanelSection>

      <PanelSection title="INVENTORY">
        {Object.keys(inventory).length === 0 ? (
          <div className="text-arcade-cyan/50">— POCKETS FREE —</div>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {Object.entries(inventory).map(([id, count]) => (
              <li
                key={id}
                className="text-arcade-green border border-arcade-green/50 rounded px-2 py-1 flex justify-between"
              >
                <span>▸ {id.toUpperCase()}</span>
                {count > 1 && <span className="text-arcade-yellow">×{count}</span>}
              </li>
            ))}
          </ul>
        )}
      </PanelSection>
    </aside>
  );
}

function RightPanel({ onOpenOverlay }) {
  return (
    <aside
      className="shrink-0 bg-arcade-dark flex flex-col gap-6 p-5 text-[10px]"
      style={{ width: SIDE_PANEL_WIDTH }}
    >
      <div className="flex justify-end">
        <Menu onOpenOverlay={onOpenOverlay} />
      </div>

      <div className="mt-auto">
        <PanelSection title="CONTROLS">
          <div className="flex flex-col gap-1.5 text-arcade-cyan/80 text-[9px] leading-relaxed">
            <div>↑ ↓ ← →&nbsp; MOVE</div>
            <div>SPACE / E&nbsp; INTERACT</div>
            <div className="text-arcade-cyan/50">(WALK ADJACENT)</div>
          </div>
        </PanelSection>
      </div>
    </aside>
  );
}

function PanelSection({ title, children }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-arcade-cyan/70 text-[9px] tracking-[0.2em]">{title}</div>
      <div>{children}</div>
    </div>
  );
}

function Menu({ onOpenOverlay }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    const id = setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener('mousedown', handler);
    };
  }, [open]);

  const choose = (which) => {
    setOpen(false);
    onOpenOverlay(which);
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        className="text-arcade-cyan hover:text-arcade-yellow px-2 py-1"
        onClick={() => setOpen((v) => !v)}
      >
        MENU ▾
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 min-w-[140px] bg-arcade-dark border border-arcade-cyan/40 rounded shadow-lg z-50">
          <button
            className="block w-full text-left px-3 py-2 text-arcade-cyan hover:text-arcade-yellow hover:bg-black"
            onClick={() => choose('leaderboard')}
          >
            LEADERBOARD
          </button>
          <button
            className="block w-full text-left px-3 py-2 text-arcade-cyan hover:text-arcade-yellow hover:bg-black"
            onClick={() => choose('about')}
          >
            ABOUT
          </button>
        </div>
      )}
    </div>
  );
}

// --- Room -------------------------------------------------------------------

function Room({ state, tile }) {
  const width = ROOM_COLS * tile;
  const height = ROOM_ROWS * tile;

  return (
    <div className="flex-1 flex items-center justify-center bg-arcade-bg overflow-hidden">
      <div
        className="relative bg-arcade-floor"
        style={{
          width,
          height,
          backgroundImage:
            'linear-gradient(rgba(94,234,212,0.12) 1px, transparent 1px),' +
            'linear-gradient(90deg, rgba(94,234,212,0.12) 1px, transparent 1px)',
          backgroundSize: `${tile}px ${tile}px`,
        }}
      >
        {ROADS.map((road, i) => (
          <RoadSegment key={i} road={road} tile={tile} />
        ))}

        {ENTITIES.map((entity) => (
          <EntityView key={entity.id} entity={entity} state={state} tile={tile} />
        ))}

        <Player player={state.player} phase={state.phase} tile={tile} />
      </div>
    </div>
  );
}

function RoadSegment({ road, tile }) {
  const stride = Math.max(8, Math.round(tile * 0.18));
  const horizontal = road.width >= road.height;
  const stripe = Math.max(2, Math.round(tile * 0.06));
  const dash = Math.max(10, Math.round(tile * 0.3));
  const gap = Math.max(8, Math.round(tile * 0.22));
  const dashGradient = `repeating-linear-gradient(${horizontal ? '90deg' : '0deg'}, rgba(252,211,77,0.85) 0 ${dash}px, transparent ${dash}px ${dash + gap}px)`;
  return (
    <div
      className="absolute"
      style={{
        left: road.x * tile,
        top: road.y * tile,
        width: road.width * tile,
        height: road.height * tile,
        background: `repeating-linear-gradient(135deg, #5a6b5a 0 ${stride}px, #4a5a4a ${stride}px ${stride + 2}px)`,
        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.4)',
      }}
    >
      <div
        className="absolute"
        style={
          horizontal
            ? {
                left: 0,
                right: 0,
                top: '50%',
                height: stripe,
                transform: 'translateY(-50%)',
                backgroundImage: dashGradient,
              }
            : {
                top: 0,
                bottom: 0,
                left: '50%',
                width: stripe,
                transform: 'translateX(-50%)',
                backgroundImage: dashGradient,
              }
        }
      />
    </div>
  );
}

// --- entity rendering -------------------------------------------------------

function EntityView({ entity, state, tile }) {
  const adjacent = isPlayerAdjacent(state.player, entity);
  const solved = state.unlocked.includes(entity.id);

  switch (entity.type) {
    case 'shop':
    case 'cafe':
      return <ShopBuilding entity={entity} tile={tile} adjacent={adjacent} solved={solved} />;
    case 'billboard':
      return <BillboardSign entity={entity} tile={tile} adjacent={adjacent} />;
    case 'corner':
      return <CornerSign entity={entity} tile={tile} />;
    case 'npc':
      return <NpcSprite entity={entity} tile={tile} adjacent={adjacent} />;
    default:
      return null;
  }
}

function ShopBuilding({ entity, tile, adjacent, solved }) {
  const w = (entity.width || 1) * tile;
  const h = (entity.height || 1) * tile;
  const pal = entity.palette || {};
  const wall = pal.wall || '#2a1a4a';
  const awning = pal.awning || '#ff2d95';
  const sign = pal.sign || '#fcd34d';
  const door = pal.door || '#1a3d4a';
  const awningH = Math.max(8, Math.round(tile * 0.25));
  const doorW = Math.max(16, Math.round(tile * 0.5));
  const doorH = Math.max(20, Math.round(tile * 0.6));
  const isCafe = entity.type === 'cafe';

  return (
    <div
      className="absolute z-10"
      style={{ left: entity.x * tile, top: entity.y * tile, width: w, height: h }}
    >
      {/* wall */}
      <div className="absolute inset-0" style={{ background: wall }} />
      {/* windows row */}
      <div
        className="absolute left-2 right-2"
        style={{
          top: awningH + 6,
          height: Math.round(tile * 0.35),
          background: `repeating-linear-gradient(90deg, rgba(255,255,255,0.08) 0 ${Math.round(tile * 0.4)}px, transparent ${Math.round(tile * 0.4)}px ${Math.round(tile * 0.55)}px)`,
        }}
      />
      {/* awning */}
      <div
        className="absolute left-0 right-0 top-0"
        style={{
          height: awningH,
          background: `repeating-linear-gradient(90deg, ${awning} 0 12px, rgba(0,0,0,0.25) 12px 14px)`,
        }}
      />
      {/* sign */}
      <div
        className="absolute left-0 right-0 flex items-center justify-center text-center glow-breathe"
        style={{
          top: awningH + 2,
          height: Math.round(tile * 0.32),
          color: sign,
          textShadow: '0 0 4px rgba(0,0,0,0.8)',
          fontSize: Math.max(8, Math.round(tile * 0.16)),
          letterSpacing: '0.15em',
        }}
      >
        {entity.name}
      </div>
      {/* door (centered, bottom) */}
      <div
        className="absolute bottom-0 left-1/2"
        style={{
          width: doorW,
          height: doorH,
          marginLeft: -doorW / 2,
          background: door,
          borderTop: `2px solid ${sign}`,
          borderLeft: '1px solid rgba(255,255,255,0.1)',
          borderRight: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {/* door knob */}
        <div
          className="absolute"
          style={{
            right: 3,
            top: '50%',
            width: 3,
            height: 3,
            background: sign,
            borderRadius: 1,
          }}
        />
      </div>
      {/* cafe terrace (small table + chair in front of door, just decorative) */}
      {isCafe && (
        <div
          className="absolute"
          style={{
            left: 4,
            bottom: 4,
            width: Math.round(tile * 0.3),
            height: Math.round(tile * 0.25),
            background: '#3a2d1f',
            borderTop: `2px solid ${awning}`,
          }}
        />
      )}
      {/* status pip when adjacent */}
      {adjacent && (
        <div
          className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bob"
          style={{
            background: '#1a3d4a',
            color: sign,
            fontSize: Math.max(7, Math.round(tile * 0.13)),
            border: `1px solid ${sign}`,
            borderRadius: 2,
          }}
        >
          {solved ? '✓ DONE' : '▾ VISIT'}
        </div>
      )}
    </div>
  );
}

function BillboardSign({ entity, tile, adjacent }) {
  const w = (entity.width || 1) * tile;
  const h = (entity.height || 2) * tile;
  return (
    <div
      className="absolute z-10"
      style={{ left: entity.x * tile, top: entity.y * tile, width: w, height: h }}
    >
      {/* board */}
      <div
        className="absolute left-0 right-0 top-0 overflow-hidden"
        style={{
          height: h - Math.round(tile * 0.25),
          background: '#234e52',
          border: '2px solid #fcd34d',
          borderRadius: 2,
        }}
      >
        {/* scrolling marquee text — vertical writing for tall boards */}
        <div
          className="absolute inset-0 flex items-center justify-center text-center px-1"
          style={{
            color: '#fcd34d',
            fontSize: Math.max(7, Math.round(tile * 0.13)),
            letterSpacing: '0.1em',
            writingMode: 'vertical-rl',
            lineHeight: 1.2,
          }}
        >
          <span className="bob inline-block">{entity.text}</span>
        </div>
      </div>
      {/* post */}
      <div
        className="absolute left-1/2 bottom-0"
        style={{
          width: 4,
          marginLeft: -2,
          height: Math.round(tile * 0.25),
          background: '#3a3a3a',
        }}
      />
      {adjacent && (
        <div
          className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bob"
          style={{
            background: '#1a3d4a',
            color: '#fcd34d',
            fontSize: Math.max(7, Math.round(tile * 0.13)),
            border: '1px solid #fcd34d',
            borderRadius: 2,
          }}
        >
          ▾ READ
        </div>
      )}
    </div>
  );
}

function CornerSign({ entity, tile }) {
  const w = (entity.width || 1) * tile;
  const h = (entity.height || 1) * tile;
  return (
    <div
      className="absolute z-10 flex flex-col items-center justify-end"
      style={{ left: entity.x * tile, top: entity.y * tile, width: w, height: h }}
    >
      <div
        className="px-2 text-center bob"
        style={{
          background: '#1a3d4a',
          color: '#5eead4',
          border: '1px solid #5eead4',
          fontSize: Math.max(7, Math.round(tile * 0.12)),
          marginBottom: Math.round(tile * 0.4),
          letterSpacing: '0.1em',
          borderRadius: 2,
        }}
      >
        {entity.text}
      </div>
      <div
        className="w-[3px] bg-stone-500"
        style={{ height: Math.round(tile * 0.4), marginBottom: 0 }}
      />
    </div>
  );
}

function NpcSprite({ entity, tile, adjacent }) {
  const w = (entity.width || 1) * tile;
  const h = (entity.height || 1) * tile;
  return (
    <div
      className="absolute z-10 flex items-end justify-center"
      style={{ left: entity.x * tile, top: entity.y * tile, width: w, height: h }}
    >
      <div className="bob">
        <PersonSprite
          size={Math.round(tile * 0.85)}
          facing="down"
          step={0}
          palette={entity.palette}
          glow="rgba(57,255,20,0.6)"
        />
      </div>
      {entity.name && (
        <div
          className={
            'absolute -top-1 left-1/2 -translate-x-1/2 px-2 py-0.5 whitespace-nowrap ' +
            (adjacent ? 'bob' : '')
          }
          style={{
            background: '#1a3d4a',
            color: '#4ade80',
            fontSize: Math.max(7, Math.round(tile * 0.13)),
            border: `1px solid ${adjacent ? '#4ade80' : 'rgba(74,222,128,0.4)'}`,
            borderRadius: 2,
            opacity: adjacent ? 1 : 0.75,
          }}
        >
          {entity.name}
          {adjacent && <span className="text-arcade-yellow ml-1">▸ TALK</span>}
        </div>
      )}
    </div>
  );
}

// --- Player sprite ----------------------------------------------------------

function Player({ player, phase, tile }) {
  return (
    <div
      className={
        'absolute flex items-end justify-center transition-all duration-150 ease-out z-30 ' +
        (phase === 'entrance' ? 'fade-in-slow' : 'fade-in')
      }
      style={{
        left: player.x * tile,
        top: player.y * tile,
        width: tile,
        height: tile,
        transform: 'translateZ(0)',
      }}
    >
      <div className="bob">
        <PersonSprite
          size={Math.round(tile * 0.85)}
          facing={player.facing}
          step={player.step}
        />
      </div>
    </div>
  );
}

// Pixel-art person rendered with discrete SVG rects. Legs alternate by `step`, so
// walking flips them on every move. Eyes shift slightly with `facing`. Body mirrors
// horizontally when facing left. Colors are overridable via `palette` for NPCs.
function PersonSprite({ size, facing = 'down', step = 0, palette = {}, glow }) {
  const flip = facing === 'left' ? -1 : 1;
  const eyeShift = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: 0, y: 0 },
    right: { x: 0, y: 0 },
  }[facing] || { x: 0, y: 0 };

  const shirt = palette.shirt || '#ff2d95';
  const shirtShadow = palette.shirtShadow || '#c81f74';
  const skin = palette.skin || '#ffd9a8';
  const pants = palette.pants || '#4b1d8a';
  const shoes = palette.shoes || '#ffe600';
  const hair = palette.hair || '#2b0b4a';
  const dark = '#1a3d4a';
  const filter = glow ? `drop-shadow(0 0 6px ${glow})` : 'drop-shadow(0 0 6px rgba(94,234,212,0.6))';

  return (
    <svg
      viewBox="0 0 16 24"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      style={{ transform: `scaleX(${flip})`, filter }}
    >
      <rect x="4" y="0" width="8" height="2" fill={hair} />
      <rect x="4" y="2" width="8" height="5" fill={skin} />
      <rect x="4" y="2" width="8" height="1" fill={hair} />
      <rect x="4" y="2" width="2" height="2" fill={hair} />
      <rect x={6 + eyeShift.x} y={4 + eyeShift.y} width="1" height="1" fill={dark} />
      <rect x={9 + eyeShift.x} y={4 + eyeShift.y} width="1" height="1" fill={dark} />
      <rect x="7" y="6" width="2" height="1" fill={dark} />
      <rect x="7" y="7" width="2" height="1" fill={skin} />
      <rect x="3" y="8" width="10" height="6" fill={shirt} />
      <rect x="3" y="9" width="10" height="1" fill={shirtShadow} />
      <rect x="2" y="8" width="1" height="5" fill={shirt} />
      <rect x="13" y="8" width="1" height="5" fill={shirt} />
      <rect x="2" y="13" width="1" height="1" fill={skin} />
      <rect x="13" y="13" width="1" height="1" fill={skin} />
      <rect x="3" y="14" width="10" height="1" fill={dark} />

      {step === 0 ? (
        <>
          <rect x="4" y="15" width="3" height="6" fill={pants} />
          <rect x="9" y="15" width="3" height="6" fill={pants} />
          <rect x="4" y="21" width="3" height="2" fill={shoes} />
          <rect x="9" y="21" width="3" height="2" fill={shoes} />
        </>
      ) : (
        <>
          <rect x="3" y="15" width="3" height="6" fill={pants} />
          <rect x="10" y="15" width="3" height="6" fill={pants} />
          <rect x="3" y="21" width="4" height="2" fill={shoes} />
          <rect x="10" y="21" width="3" height="2" fill={shoes} />
        </>
      )}
    </svg>
  );
}

// --- Dialog -----------------------------------------------------------------

function Dialog({ entity, state, onResolve }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onResolve({ kind: 'close' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onResolve]);

  const title = entity.name || entity.text || entity.type.toUpperCase();
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm fade-in">
      <div className="w-[80%] max-w-md bg-arcade-dark border-2 border-arcade-pink rounded-md p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-arcade-yellow text-[10px]">{title}</div>
          <button
            className="text-arcade-cyan text-[10px] hover:text-arcade-pink"
            onClick={() => onResolve({ kind: 'close' })}
          >
            [ESC]
          </button>
        </div>
        <DialogBody entity={entity} state={state} onResolve={onResolve} />
      </div>
    </div>
  );
}

function DialogBody({ entity, state, onResolve }) {
  const inter = entity.interaction;
  if (!inter) return null;
  const solved = state.unlocked.includes(entity.id);

  if (inter.kind === 'note') {
    return (
      <>
        <BodyText text={inter.text} />
        <DialogFooter>
          <PrimaryButton onClick={() => onResolve({ kind: 'close' })}>CLOSE</PrimaryButton>
        </DialogFooter>
      </>
    );
  }

  if (inter.kind === 'code') {
    if (solved) {
      return (
        <>
          <BodyText text={inter.rewardText || 'Already unlocked.'} />
          <DialogFooter>
            <PrimaryButton onClick={() => onResolve({ kind: 'close' })}>CLOSE</PrimaryButton>
          </DialogFooter>
        </>
      );
    }
    // Optional item gate: must have requiresItem (with optional count) before answering.
    if (inter.requiresItem) {
      const need = inter.requiresCount || 1;
      const have = invCount(state.inventory, inter.requiresItem);
      if (have < need) {
        return (
          <>
            <BodyText text={inter.lockedText || inter.text} />
            <div className="text-[10px] text-arcade-pink mb-3">
              (Needs: {need > 1 ? `${need}× ` : ''}{inter.requiresItem.toUpperCase()})
            </div>
            <DialogFooter>
              <PrimaryButton onClick={() => onResolve({ kind: 'close' })}>CLOSE</PrimaryButton>
            </DialogFooter>
          </>
        );
      }
    }
    return (
      <>
        <BodyText text={inter.text} />
        <CodePrompt
          prompt={inter.prompt}
          length={inter.length}
          expected={inter.code}
          successText={inter.rewardText}
          onSuccess={() => onResolve({ kind: 'unlock' })}
        />
      </>
    );
  }

  if (inter.kind === 'trade') {
    return <TradeBody entity={entity} state={state} onResolve={onResolve} />;
  }

  if (inter.kind === 'exit') {
    if (inter.requiresItem) {
      const need = inter.requiresCount || 1;
      const have = invCount(state.inventory, inter.requiresItem);
      if (have < need) {
        return (
          <>
            <BodyText text={inter.text || 'The gate is closed.'} />
            <div className="text-[10px] text-arcade-pink mb-3">
              (You need: {need > 1 ? `${need}× ` : ''}{inter.requiresItem.toUpperCase()})
            </div>
            <DialogFooter>
              <PrimaryButton onClick={() => onResolve({ kind: 'close' })}>BACK</PrimaryButton>
            </DialogFooter>
          </>
        );
      }
      return (
        <>
          <BodyText text={inter.boardText || 'You step through.'} />
          <DialogFooter>
            <PrimaryButton onClick={() => onResolve({ kind: 'win' })}>BOARD THE TRAIN</PrimaryButton>
          </DialogFooter>
        </>
      );
    }
    return (
      <>
        <BodyText text={inter.text || 'Enter the exit code.'} />
        <CodePrompt
          prompt={inter.prompt}
          length={inter.length}
          expected={inter.code}
          successText="The lock clunks open. You step out into the night."
          onSuccess={() => onResolve({ kind: 'win' })}
        />
      </>
    );
  }

  return null;
}

// Trade body has local "just traded" success state so repeatable trades can fire
// multiple times without auto-closing the dialog between turns.
function TradeBody({ entity, state, onResolve }) {
  const inter = entity.interaction;
  const [justTraded, setJustTraded] = useState(false);
  const solved = state.unlocked.includes(entity.id);
  const need = inter.requiresCount || 1;
  const rewardCount = inter.rewardCount || 1;
  const have = invCount(state.inventory, inter.requiresItem);

  if (justTraded) {
    return (
      <>
        <BodyText text={inter.rewardText || 'Trade complete.'} />
        <DialogFooter>
          <PrimaryButton onClick={() => onResolve({ kind: 'close' })}>CONTINUE</PrimaryButton>
        </DialogFooter>
      </>
    );
  }

  if (solved && !inter.repeatable) {
    return (
      <>
        <BodyText text={inter.rewardText || 'Trade complete.'} />
        <DialogFooter>
          <PrimaryButton onClick={() => onResolve({ kind: 'close' })}>CLOSE</PrimaryButton>
        </DialogFooter>
      </>
    );
  }

  if (have < need) {
    return (
      <>
        <BodyText text={inter.lockedText || inter.text} />
        <div className="text-[9px] text-arcade-pink/80 mb-3">
          (Needs: {need > 1 ? `${need}× ` : ''}{inter.requiresItem.toUpperCase()})
        </div>
        <DialogFooter>
          <PrimaryButton onClick={() => onResolve({ kind: 'close' })}>CLOSE</PrimaryButton>
        </DialogFooter>
      </>
    );
  }

  return (
    <>
      <BodyText text={inter.text} />
      <div className="text-[10px] text-arcade-cyan mb-3">
        GIVE <span className="text-arcade-pink">
          {need > 1 ? `${need}× ` : ''}
          {inter.requiresItem.toUpperCase()}
        </span>
        {inter.rewardItem && (
          <>
            {' → '}
            GET <span className="text-arcade-green">
              {rewardCount > 1 ? `${rewardCount}× ` : ''}
              {inter.rewardItem.toUpperCase()}
            </span>
          </>
        )}
      </div>
      <DialogFooter>
        <button
          onClick={() => onResolve({ kind: 'close' })}
          className="text-[10px] px-3 py-2 border border-arcade-cyan/50 text-arcade-cyan rounded-sm hover:text-arcade-yellow hover:border-arcade-yellow"
        >
          NEVERMIND
        </button>
        <PrimaryButton
          onClick={() => {
            onResolve({ kind: 'unlock', keepOpen: true });
            setJustTraded(true);
          }}
        >
          {inter.prompt || 'TRADE'}
        </PrimaryButton>
      </DialogFooter>
    </>
  );
}

function BodyText({ text }) {
  return (
    <div
      className="text-arcade-cyan mb-4 min-h-[3rem]"
      style={{ fontFamily: 'VT323, monospace', fontSize: 22, lineHeight: 1.2 }}
    >
      {text}
    </div>
  );
}

function DialogFooter({ children }) {
  return <div className="flex justify-end gap-2">{children}</div>;
}

function PrimaryButton({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="text-[10px] px-3 py-2 bg-arcade-pink text-black hover:bg-arcade-yellow transition-colors rounded-sm"
    >
      {children}
    </button>
  );
}

function CodePrompt({ prompt, length, expected, successText, onSuccess }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = () => {
    if (value.trim() === expected) {
      setSuccess(true);
      setError('');
    } else {
      setError('NOT QUITE — TRY AGAIN');
      setValue('');
      setTimeout(() => setError(''), 1200);
    }
  };

  if (success) {
    return (
      <>
        <div
          className="text-arcade-green mb-4"
          style={{ fontFamily: 'VT323, monospace', fontSize: 22, lineHeight: 1.2 }}
        >
          {successText || 'Unlocked.'}
        </div>
        <DialogFooter>
          <PrimaryButton onClick={onSuccess}>CONTINUE</PrimaryButton>
        </DialogFooter>
      </>
    );
  }

  return (
    <div>
      <div className="text-[10px] text-arcade-yellow mb-2">{prompt || 'ENTER CODE'}</div>
      <div className="flex items-center gap-2 mb-3">
        <input
          ref={inputRef}
          value={value}
          maxLength={length || 16}
          onChange={(e) => setValue(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submit();
            }
          }}
          className="flex-1 bg-black border-2 border-arcade-cyan text-arcade-yellow px-3 py-2 tracking-[0.4em] text-center text-lg"
          style={{ fontFamily: 'VT323, monospace' }}
          spellCheck={false}
          autoComplete="off"
        />
        <PrimaryButton onClick={submit}>ENTER</PrimaryButton>
      </div>
      {error && <div className="text-[10px] text-arcade-pink blink">{error}</div>}
    </div>
  );
}

// --- Win screen -------------------------------------------------------------

function WinScreen({ elapsedMs, onRestart }) {
  const [name, setName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [board, setBoard] = useState(() => loadLeaderboard());

  const submit = () => {
    const cleanName = name.trim().toUpperCase().slice(0, 8) || 'AAA';
    const next = addLeaderboardEntry({
      name: cleanName,
      timeMs: elapsedMs,
      date: new Date().toISOString(),
    });
    setBoard(next);
    setSubmitted(true);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-start p-6 gap-4 bg-arcade-bg">
      <div className="text-arcade-yellow text-xl mt-2 neon">★ GOLDEN HOUR RIDE ★</div>
      <div className="text-arcade-green text-[10px]">
        CLEAR TIME&nbsp;<span className="text-arcade-cyan">{formatTime(elapsedMs)}</span>
      </div>

      {!submitted && (
        <div className="flex flex-col items-center gap-2 mt-2">
          <div className="text-[10px] text-arcade-cyan">ENTER INITIALS FOR LEADERBOARD</div>
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              maxLength={8}
              autoFocus
              className="bg-black border-2 border-arcade-cyan text-arcade-yellow px-3 py-2 tracking-[0.4em] text-center text-lg"
              style={{ fontFamily: 'VT323, monospace' }}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
              spellCheck={false}
            />
            <PrimaryButton onClick={submit}>SAVE</PrimaryButton>
            <button
              onClick={() => setSubmitted(true)}
              className="text-[10px] px-3 py-2 border border-arcade-cyan/50 text-arcade-cyan rounded-sm hover:text-arcade-yellow hover:border-arcade-yellow"
            >
              SKIP
            </button>
          </div>
        </div>
      )}

      <div className="w-full max-w-sm mt-2">
        <div className="text-[10px] text-arcade-pink mb-2 text-center">— HIGH SCORES —</div>
        {board.length === 0 ? (
          <div className="text-center text-arcade-cyan/60 text-[10px]">NO ENTRIES YET</div>
        ) : (
          <ol className="text-arcade-cyan text-[10px] space-y-1">
            {board.map((row, i) => (
              <li key={`${row.name}-${row.date}-${i}`} className="flex justify-between border-b border-arcade-cyan/10 pb-1">
                <span className="text-arcade-yellow">{String(i + 1).padStart(2, '0')}</span>
                <span>{row.name}</span>
                <span className="text-arcade-green">{formatTime(row.timeMs)}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="mt-auto flex gap-3 mb-2">
        <PrimaryButton onClick={onRestart}>PLAY AGAIN</PrimaryButton>
      </div>
    </div>
  );
}

// --- Overlays ---------------------------------------------------------------

function OverlayShell({ title, onClose, children }) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm fade-in">
      <div className="w-[80%] max-w-md bg-arcade-dark border-2 border-arcade-cyan/60 rounded-md p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-arcade-yellow text-[10px]">{title}</div>
          <button
            className="text-arcade-cyan text-[10px] hover:text-arcade-pink"
            onClick={onClose}
          >
            [X]
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function LeaderboardOverlay({ onClose }) {
  const board = loadLeaderboard();
  return (
    <OverlayShell title="LEADERBOARD" onClose={onClose}>
      {board.length === 0 ? (
        <div className="text-center text-arcade-cyan/60 text-[10px] py-6">NO ENTRIES YET</div>
      ) : (
        <ol className="text-arcade-cyan text-[10px] space-y-1">
          {board.map((row, i) => (
            <li
              key={`${row.name}-${row.date}-${i}`}
              className="flex justify-between border-b border-arcade-cyan/10 pb-1"
            >
              <span className="text-arcade-yellow">{String(i + 1).padStart(2, '0')}</span>
              <span>{row.name}</span>
              <span className="text-arcade-green">{formatTime(row.timeMs)}</span>
            </li>
          ))}
        </ol>
      )}
    </OverlayShell>
  );
}

function AboutOverlay({ onClose }) {
  return (
    <OverlayShell title="ABOUT" onClose={onClose}>
      <div
        className="text-arcade-cyan leading-snug"
        style={{ fontFamily: 'VT323, monospace', fontSize: 20, lineHeight: 1.3 }}
      >
        <p className="mb-3">
          LUMEN PLAZA — your city on a perfect afternoon. Explore the streets,
          trade and puzzle your way through the plaza, and catch the sunset
          express before golden hour ends.
        </p>
        <p className="mb-3">
          Walk with the ARROW KEYS. Stand next to an object and press SPACE or E
          to interact.
        </p>
        <p className="text-arcade-pink/80 text-[10px]" style={{ fontFamily: 'inherit' }}>
          Built with React + Vite.
        </p>
      </div>
    </OverlayShell>
  );
}
