// All building / decoration render components. Most are pure CSS/SVG — the
// only state they read is `adjacent` (for the "visit" pip) and `solved`.
//
// Z-index layers used here:
//   z-[5]   parks / ground patches (under everything walkable)
//   z-10    buildings, decor (lamps, trees, planters, fountain)
//   z-[15]  pedestrians (drift over decor, below player)
//   z-[18]  cable line
//   z-[19]  cable car cabin
//   z-20    visit pips (always topmost on entities, below player z-30)

// ---------- shared helpers ----------

function doorStyle(doorSide, doorW, doorH, sign, doorColor) {
  const base = { position: 'absolute', background: doorColor, boxSizing: 'border-box' };
  const knob = (side) => (
    <div
      className="absolute"
      style={{
        width: 3,
        height: 3,
        background: sign,
        borderRadius: 1,
        ...(side === 'south' && { right: 3, top: '40%' }),
        ...(side === 'north' && { right: 3, bottom: '40%' }),
        ...(side === 'east' && { left: '40%', top: 3 }),
        ...(side === 'west' && { right: '40%', top: 3 }),
      }}
    />
  );
  if (doorSide === 'north') {
    return {
      wrap: { ...base, top: 0, left: '50%', width: doorW, height: doorH, marginLeft: -doorW / 2, borderBottom: `2px solid ${sign}` },
      knob: knob('north'),
    };
  }
  if (doorSide === 'east') {
    return {
      wrap: { ...base, right: 0, top: '50%', width: doorH, height: doorW, marginTop: -doorW / 2, borderLeft: `2px solid ${sign}` },
      knob: knob('east'),
    };
  }
  if (doorSide === 'west') {
    return {
      wrap: { ...base, left: 0, top: '50%', width: doorH, height: doorW, marginTop: -doorW / 2, borderRight: `2px solid ${sign}` },
      knob: knob('west'),
    };
  }
  return {
    wrap: { ...base, bottom: 0, left: '50%', width: doorW, height: doorH, marginLeft: -doorW / 2, borderTop: `2px solid ${sign}` },
    knob: knob('south'),
  };
}

function VisitPip({ adjacent, solved, sign, doorSide, tile, label = 'VISIT' }) {
  if (!adjacent) return null;
  const offset =
    doorSide === 'north'
      ? '-top-2 left-1/2 -translate-x-1/2'
      : doorSide === 'south'
        ? '-bottom-2 left-1/2 -translate-x-1/2'
        : doorSide === 'east'
          ? 'top-1/2 -right-1 translate-x-full -translate-y-1/2'
          : 'top-1/2 -left-1 -translate-x-full -translate-y-1/2';
  return (
    <div
      className={`absolute px-2 py-0.5 bob whitespace-nowrap z-20 ${offset}`}
      style={{
        background: '#0e2535',
        color: sign,
        fontSize: Math.max(7, Math.round(tile * 0.13)),
        border: `1px solid ${sign}`,
        borderRadius: 2,
      }}
    >
      {solved ? '✓ DONE' : `▾ ${label}`}
    </div>
  );
}

// A horizontal strip of warm, slightly flickering windows for night life.
// `top` is the y offset (in px) of the window row from the building's top.
function WindowStrip({ wTiles, tile, top, windowColor = '#fcd34d' }) {
  const stripPad = 8;
  const stripWidth = wTiles * tile - stripPad * 2;
  const windowW = Math.max(8, Math.round(tile * 0.28));
  const gap = Math.max(4, Math.round(tile * 0.12));
  const fit = Math.max(2, Math.floor((stripWidth + gap) / (windowW + gap)));
  const windowH = Math.round(tile * 0.22);
  const windows = [];
  for (let i = 0; i < fit; i++) {
    windows.push(
      <div
        key={i}
        className="window-flicker"
        style={{
          width: windowW,
          height: windowH,
          background: windowColor,
          boxShadow: `0 0 ${Math.max(6, Math.round(tile * 0.18))}px rgba(252,211,77,0.55)`,
          border: '1px solid rgba(0,0,0,0.45)',
          borderRadius: 1,
          animationDelay: `${(i * 0.7) % 5}s`,
        }}
      />,
    );
  }
  return (
    <div
      className="absolute flex items-center justify-center"
      style={{
        left: stripPad,
        right: stripPad,
        top,
        height: windowH,
        gap,
      }}
    >
      {windows}
    </div>
  );
}

// ---------- shops & cafes ----------

export function ShopBuilding({ entity, tile, adjacent, solved }) {
  const wTiles = entity.width || 1;
  const hTiles = entity.height || 1;
  const w = wTiles * tile;
  const h = hTiles * tile;
  const pal = entity.palette || {};
  const wall = pal.wall || '#2a1a4a';
  const awning = pal.awning || '#ff8a8a';
  const sign = pal.sign || '#fcd34d';
  const door = pal.door || '#0e2535';
  const doorSide = entity.doorSide || 'south';
  const compact = hTiles === 1;
  const isCafe = entity.type === 'cafe';
  const awningH = compact ? Math.max(6, Math.round(tile * 0.22)) : Math.max(8, Math.round(tile * 0.25));
  const doorW = Math.max(compact ? 12 : 16, Math.round(tile * (compact ? 0.45 : 0.5)));
  const doorH = Math.max(compact ? 10 : 20, Math.round(tile * (compact ? 0.35 : 0.6)));
  const { wrap: doorWrap, knob: doorKnob } = doorStyle(doorSide, doorW, doorH, sign, door);
  const signSize = Math.max(6, Math.round(tile * (compact ? 0.11 : 0.16)));

  // The "top stack" depends on which side the door is on. For a north door we
  // push the awning down to fully wrap the door, then everything else lives
  // below that band. For other doors we keep the awning slim at the top.
  const topPad = doorSide === 'north' ? Math.max(awningH, doorH) : awningH;
  const windowH = Math.round(tile * 0.22);
  const windowsTop = topPad + 6;
  const signTop = compact
    ? (doorSide === 'north' ? doorH + 2 : awningH)
    : windowsTop + windowH + 4;
  const signBottom = compact
    ? (doorSide === 'south' ? doorH : 2)
    : (doorSide === 'south' ? doorH + 2 : 2);

  return (
    <div
      className="absolute z-10"
      style={{ left: entity.x * tile, top: entity.y * tile, width: w, height: h }}
    >
      <div className="absolute inset-0" style={{ background: wall }} />

      {!compact && (
        <WindowStrip wTiles={wTiles} tile={tile} top={windowsTop} />
      )}

      <div
        className="absolute left-0 right-0 top-0"
        style={{
          height: topPad,
          background: `repeating-linear-gradient(90deg, ${awning} 0 12px, rgba(0,0,0,0.2) 12px 14px)`,
        }}
      />

      <div
        className="absolute left-0 right-0 flex items-center justify-center text-center glow-breathe"
        style={{
          top: signTop,
          bottom: signBottom,
          color: sign,
          textShadow: '0 0 4px rgba(0,0,0,0.8)',
          fontSize: signSize,
          letterSpacing: compact ? '0.05em' : '0.15em',
          lineHeight: 1.1,
          padding: '0 2px',
        }}
      >
        {entity.name}
      </div>

      <div style={doorWrap}>{doorKnob}</div>

      {isCafe && !compact && doorSide === 'south' && (
        <div
          className="absolute"
          style={{
            left: 4,
            bottom: doorH + 2,
            width: Math.round(tile * 0.3),
            height: Math.round(tile * 0.2),
            background: '#3a2d1f',
            borderTop: `2px solid ${awning}`,
          }}
        />
      )}

      <VisitPip adjacent={adjacent} solved={solved} sign={sign} doorSide={doorSide} tile={tile} />
    </div>
  );
}

export function CityHallBuilding({ entity, tile, adjacent, solved }) {
  const w = (entity.width || 2) * tile;
  const h = (entity.height || 2) * tile;
  const sign = '#fcd34d';
  const doorSide = entity.doorSide || 'south';
  const doorW = Math.max(20, Math.round(tile * 0.55));
  const doorH = Math.max(22, Math.round(tile * 0.55));
  const { wrap: doorWrap, knob: doorKnob } = doorStyle(doorSide, doorW, doorH, sign, '#143849');

  return (
    <div
      className="absolute z-10"
      style={{ left: entity.x * tile, top: entity.y * tile, width: w, height: h }}
    >
      <div className="absolute inset-0" style={{ background: '#e8e4dc' }} />
      <div
        className="absolute left-0 right-0 top-0"
        style={{
          height: Math.round(tile * 0.2),
          background: 'repeating-linear-gradient(90deg, #5eead4 0 14px, #4ade80 14px 28px)',
        }}
      />
      {[0.15, 0.55].map((fx) => (
        <div
          key={fx}
          className="absolute window-flicker"
          style={{
            left: `${fx * 100}%`,
            top: Math.round(tile * 0.22),
            width: Math.round(tile * 0.12),
            height: h - Math.round(tile * 0.35),
            background: 'rgba(252,211,77,0.4)',
            borderLeft: '2px solid rgba(252,211,77,0.7)',
            borderRight: '2px solid rgba(252,211,77,0.7)',
            animationDelay: `${fx * 4}s`,
          }}
        />
      ))}
      <div
        className="absolute left-0 right-0 flex items-center justify-center text-center"
        style={{
          top: Math.round(tile * 0.28),
          color: '#143849',
          fontSize: Math.max(7, Math.round(tile * 0.14)),
          letterSpacing: '0.12em',
        }}
      >
        {entity.name}
      </div>
      <div style={doorWrap}>{doorKnob}</div>
      <VisitPip adjacent={adjacent} solved={solved} sign={sign} doorSide={doorSide} tile={tile} />
    </div>
  );
}

// ---------- houses ----------

export function HouseBuilding({ entity, tile, adjacent, solved }) {
  const wTiles = entity.width || 2;
  const hTiles = entity.height || 2;
  const w = wTiles * tile;
  const h = hTiles * tile;
  const pal = entity.palette || {};
  const wall = pal.wall || '#b07a5a';
  const roof = pal.roof || '#5a2d2d';
  const trim = pal.trim || '#f2d6a8';
  const windowColor = pal.window || '#fcd34d';
  const doorColor = pal.door || '#3a1f1f';
  const roofH = Math.round(tile * 0.45);
  const doorW = Math.max(12, Math.round(tile * 0.32));
  const doorH = Math.max(16, Math.round(tile * 0.5));
  const windowW = Math.max(8, Math.round(tile * 0.22));
  const windowH = Math.max(8, Math.round(tile * 0.22));

  return (
    <div
      className="absolute z-10"
      style={{ left: entity.x * tile, top: entity.y * tile, width: w, height: h }}
    >
      {/* wall */}
      <div className="absolute" style={{ left: 0, right: 0, top: roofH, bottom: 0, background: wall }} />
      {/* roof: triangle made with borders */}
      <div
        className="absolute"
        style={{
          left: -2,
          top: 0,
          width: 0,
          height: 0,
          borderLeft: `${w / 2 + 2}px solid transparent`,
          borderRight: `${w / 2 + 2}px solid transparent`,
          borderBottom: `${roofH}px solid ${roof}`,
        }}
      />
      {/* roof trim */}
      <div
        className="absolute"
        style={{
          left: 0,
          right: 0,
          top: roofH - 2,
          height: 3,
          background: trim,
        }}
      />
      {/* chimney — only rendered if entity.chimney is set */}
      {entity.chimney && (
        <div
          className="absolute"
          style={{
            right: Math.round(tile * 0.25),
            top: Math.round(tile * 0.1),
            width: Math.round(tile * 0.14),
            height: Math.round(tile * 0.28),
            background: '#4a2a2a',
            borderTop: `2px solid ${trim}`,
            borderLeft: '1px solid rgba(0,0,0,0.3)',
          }}
        >
          {/* smoke (animated drift) */}
          <div
            className="absolute smoke-drift"
            style={{
              left: '50%',
              top: -3,
              width: 7,
              height: 7,
              background: 'rgba(220, 230, 240, 0.55)',
              borderRadius: '50%',
              marginLeft: -3.5,
            }}
          />
          <div
            className="absolute smoke-drift"
            style={{
              left: '50%',
              top: -3,
              width: 5,
              height: 5,
              background: 'rgba(220, 230, 240, 0.4)',
              borderRadius: '50%',
              marginLeft: -2.5,
              animationDelay: '1.6s',
            }}
          />
        </div>
      )}
      {/* windows (left + right) */}
      <div
        className="absolute window-flicker"
        style={{
          left: Math.round(tile * 0.2),
          top: roofH + 6,
          width: windowW,
          height: windowH,
          background: windowColor,
          border: `2px solid ${trim}`,
          boxShadow: `0 0 ${Math.max(6, Math.round(tile * 0.18))}px rgba(252,211,77,0.55)`,
        }}
      />
      <div
        className="absolute window-flicker"
        style={{
          right: Math.round(tile * 0.2),
          top: roofH + 6,
          width: windowW,
          height: windowH,
          background: windowColor,
          border: `2px solid ${trim}`,
          boxShadow: `0 0 ${Math.max(6, Math.round(tile * 0.18))}px rgba(252,211,77,0.55)`,
          animationDelay: '1.8s',
        }}
      />
      {/* door */}
      <div
        className="absolute"
        style={{
          left: '50%',
          bottom: 0,
          width: doorW,
          height: doorH,
          marginLeft: -doorW / 2,
          background: doorColor,
          borderTop: `2px solid ${trim}`,
        }}
      >
        <div
          className="absolute"
          style={{ right: 3, top: '45%', width: 3, height: 3, background: windowColor, borderRadius: 1 }}
        />
      </div>
      {/* number plate — prominent badge below the roof line */}
      {entity.number != null && (
        <div
          className="absolute text-center"
          style={{
            left: '50%',
            top: roofH - Math.max(4, Math.round(tile * 0.05)),
            transform: 'translateX(-50%)',
            color: '#0e2535',
            background: trim,
            fontSize: Math.max(9, Math.round(tile * 0.2)),
            letterSpacing: '0.04em',
            padding: '1px 6px',
            borderRadius: 2,
            lineHeight: 1.1,
            fontWeight: 'bold',
            boxShadow: '0 1px 2px rgba(0,0,0,0.5)',
            border: '1px solid rgba(0,0,0,0.35)',
            fontFamily: 'VT323, monospace',
          }}
        >
          {entity.number}
        </div>
      )}
      {/* wall poster (e.g. MISSING DOG) */}
      {entity.poster && (
        <div
          className="absolute text-center"
          style={{
            right: '12%',
            bottom: doorH + 4,
            width: Math.round(tile * 0.42),
            background: '#fff7e6',
            border: '1px solid #5a2d2d',
            transform: 'rotate(-4deg)',
            color: '#5a2d2d',
            fontSize: Math.max(5, Math.round(tile * 0.085)),
            lineHeight: 1.05,
            padding: '2px 3px',
            letterSpacing: '0.04em',
            boxShadow: '1px 2px 2px rgba(0,0,0,0.4)',
            fontFamily: 'VT323, monospace',
            fontWeight: 'bold',
          }}
        >
          {entity.poster}
        </div>
      )}
      {adjacent && entity.interaction && (
        <div
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bob whitespace-nowrap z-20"
          style={{
            background: '#0e2535',
            color: windowColor,
            fontSize: Math.max(7, Math.round(tile * 0.13)),
            border: `1px solid ${windowColor}`,
            borderRadius: 2,
          }}
        >
          {solved ? '✓ DONE' : '▾ KNOCK'}
        </div>
      )}
    </div>
  );
}

// ---------- decor (non-blocking) ----------

export function LampPost({ entity, tile }) {
  const lampSize = Math.max(8, Math.round(tile * 0.2));
  const poleH = Math.round(tile * 0.55);
  const poleW = Math.max(2, Math.round(tile * 0.05));
  return (
    <div
      className="absolute z-10 flex flex-col items-center justify-end pointer-events-none"
      style={{ left: entity.x * tile, top: entity.y * tile, width: tile, height: tile }}
    >
      {/* glow halo (large, soft) */}
      <div
        className="absolute lamp-pulse rounded-full"
        style={{
          bottom: poleH + lampSize * 0.5,
          width: lampSize * 3,
          height: lampSize * 3,
          background: 'radial-gradient(circle, rgba(252,211,77,0.45) 0%, transparent 60%)',
        }}
      />
      {/* lamp head */}
      <div
        className="rounded-full lamp-pulse"
        style={{
          width: lampSize,
          height: lampSize,
          background: 'radial-gradient(circle at 35% 35%, #fff7d0, #fcd34d 70%)',
          marginBottom: 1,
        }}
      />
      {/* arm joint */}
      <div style={{ width: poleW + 1, height: 2, background: '#4a4a55' }} />
      {/* pole */}
      <div style={{ width: poleW, height: poleH, background: '#3a3a47' }} />
    </div>
  );
}

export function TreeSprite({ entity, tile }) {
  const trunkW = Math.max(3, Math.round(tile * 0.08));
  const trunkH = Math.round(tile * 0.25);
  const canopySize = Math.round(tile * 0.65);
  return (
    <div
      className="absolute z-10 flex flex-col items-center justify-end pointer-events-none"
      style={{ left: entity.x * tile, top: entity.y * tile, width: tile, height: tile }}
    >
      <div
        className="rounded-full sway"
        style={{
          width: canopySize,
          height: canopySize,
          background: 'radial-gradient(circle at 32% 32%, #7ed492, #2d6b3a 75%)',
          border: '1px solid rgba(0,0,0,0.25)',
          marginBottom: -trunkH * 0.25,
          transformOrigin: 'bottom center',
          boxShadow: 'inset -4px -4px 0 rgba(0,0,0,0.15)',
        }}
      />
      <div style={{ width: trunkW, height: trunkH, background: '#5c3d22' }} />
    </div>
  );
}

export function PlanterSprite({ entity, tile }) {
  const boxW = Math.round(tile * 0.65);
  const boxH = Math.round(tile * 0.22);
  const flowerSize = Math.max(3, Math.round(tile * 0.09));
  return (
    <div
      className="absolute z-10 flex flex-col items-center justify-end pointer-events-none"
      style={{ left: entity.x * tile, top: entity.y * tile, width: tile, height: tile }}
    >
      <div
        className="flex items-end gap-1 sway"
        style={{ marginBottom: -2, transformOrigin: 'bottom center' }}
      >
        <div className="rounded-full" style={{ width: flowerSize, height: flowerSize, background: '#ff8a8a', boxShadow: '0 0 4px #ff8a8a' }} />
        <div className="rounded-full" style={{ width: flowerSize, height: flowerSize, background: '#fcd34d', boxShadow: '0 0 4px #fcd34d' }} />
        <div className="rounded-full" style={{ width: flowerSize, height: flowerSize, background: '#c4a5ff', boxShadow: '0 0 4px #c4a5ff' }} />
      </div>
      <div
        style={{
          width: boxW,
          height: boxH,
          background: 'linear-gradient(to bottom, #7a4b2a, #4a2b1a)',
          borderTop: '2px solid #2d6b3a',
          borderRadius: 2,
        }}
      />
    </div>
  );
}

export function BenchSprite({ entity, tile }) {
  const seatW = Math.round(tile * 0.7);
  const seatH = Math.max(3, Math.round(tile * 0.08));
  const legH = Math.round(tile * 0.18);
  return (
    <div
      className="absolute z-10 flex flex-col items-center justify-end pointer-events-none"
      style={{ left: entity.x * tile, top: entity.y * tile, width: tile, height: tile }}
    >
      {/* backrest */}
      <div style={{ width: seatW, height: seatH, background: '#7a4b2a', marginBottom: 1 }} />
      {/* seat */}
      <div style={{ width: seatW, height: seatH, background: '#a87553', marginBottom: 1 }} />
      {/* legs */}
      <div className="flex w-full justify-between" style={{ paddingLeft: (tile - seatW) / 2 + 4, paddingRight: (tile - seatW) / 2 + 4 }}>
        <div style={{ width: 3, height: legH, background: '#3a3a3a' }} />
        <div style={{ width: 3, height: legH, background: '#3a3a3a' }} />
      </div>
    </div>
  );
}

// ---------- fountain ----------

export function FountainSprite({ entity, tile, adjacent }) {
  const w = (entity.width || 2) * tile;
  const h = (entity.height || 2) * tile;
  const basinSize = Math.min(w, h) * 0.85;
  return (
    <div
      className="absolute z-10"
      style={{ left: entity.x * tile, top: entity.y * tile, width: w, height: h }}
    >
      {/* outer basin ring */}
      <div
        className="absolute rounded-full"
        style={{
          left: '50%',
          top: '50%',
          width: basinSize,
          height: basinSize,
          marginLeft: -basinSize / 2,
          marginTop: -basinSize / 2,
          background: 'radial-gradient(circle at 50% 35%, #5eead4, #143849 70%)',
          border: '3px solid #93c5b8',
          boxShadow: '0 0 18px rgba(94,234,212,0.4)',
        }}
      />
      {/* center column */}
      <div
        className="absolute"
        style={{
          left: '50%',
          top: '50%',
          width: Math.round(tile * 0.14),
          height: Math.round(tile * 0.22),
          marginLeft: -Math.round(tile * 0.07),
          marginTop: -Math.round(tile * 0.05),
          background: '#93c5b8',
          borderRadius: 2,
        }}
      />
      {/* water spurt */}
      <div
        className="absolute fountain-spurt"
        style={{
          left: '50%',
          top: Math.round(h * 0.22),
          width: 5,
          height: Math.round(h * 0.32),
          marginLeft: -2.5,
          background: 'linear-gradient(to top, rgba(94,234,212,1), rgba(94,234,212,0.1))',
          borderRadius: 3,
          transformOrigin: 'bottom center',
        }}
      />
      {/* side splashes */}
      <div
        className="absolute fountain-spurt"
        style={{
          left: '40%',
          top: Math.round(h * 0.32),
          width: 3,
          height: Math.round(h * 0.18),
          background: 'linear-gradient(to top, rgba(94,234,212,0.8), rgba(94,234,212,0.1))',
          borderRadius: 2,
          transformOrigin: 'bottom center',
          animationDelay: '0.4s',
        }}
      />
      <div
        className="absolute fountain-spurt"
        style={{
          right: '40%',
          top: Math.round(h * 0.32),
          width: 3,
          height: Math.round(h * 0.18),
          background: 'linear-gradient(to top, rgba(94,234,212,0.8), rgba(94,234,212,0.1))',
          borderRadius: 2,
          transformOrigin: 'bottom center',
          animationDelay: '0.9s',
        }}
      />
      {adjacent && entity.interaction && (
        <div
          className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bob z-20"
          style={{
            background: '#0e2535',
            color: '#5eead4',
            fontSize: Math.max(7, Math.round(tile * 0.13)),
            border: '1px solid #5eead4',
            borderRadius: 2,
          }}
        >
          ▾ LOOK
        </div>
      )}
    </div>
  );
}

// ---------- park (existing, kept for backward compat) ----------

export function ParkGround({ entity, tile, adjacent }) {
  const w = (entity.width || 2) * tile;
  const h = (entity.height || 2) * tile;
  const trees = [
    { x: 0.12, y: 0.15 },
    { x: 0.72, y: 0.2 },
    { x: 0.42, y: 0.55 },
  ];

  return (
    <div
      className="absolute z-[5]"
      style={{ left: entity.x * tile, top: entity.y * tile, width: w, height: h }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: '#2d6b3a',
          backgroundImage:
            'repeating-linear-gradient(90deg, rgba(255,255,255,0.06) 0 8px, transparent 8px 16px)',
        }}
      />
      <div
        className="absolute"
        style={{
          left: '15%',
          right: '15%',
          top: '45%',
          height: 3,
          background: '#c4a574',
          borderRadius: 1,
        }}
      />
      {trees.map((t, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            left: t.x * w,
            top: t.y * h,
            width: Math.round(tile * 0.35),
            height: Math.round(tile * 0.45),
          }}
        >
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2"
            style={{ width: 4, height: '35%', background: '#5c4033' }}
          />
          <div
            className="absolute top-0 left-0 right-0 rounded-sm sway"
            style={{ height: '65%', background: '#2d6b3a', transformOrigin: 'bottom center' }}
          />
        </div>
      ))}
      {adjacent && (
        <div
          className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bob z-20"
          style={{
            background: '#0e2535',
            color: '#4ade80',
            fontSize: Math.max(7, Math.round(tile * 0.13)),
            border: '1px solid #4ade80',
            borderRadius: 2,
          }}
        >
          ▾ VISIT
        </div>
      )}
    </div>
  );
}

// ---------- phone booth ----------

export function PhoneBoothBuilding({ entity, tile, adjacent, solved }) {
  const wTiles = entity.width || 1;
  const hTiles = entity.height || 2;
  const w = wTiles * tile;
  const h = hTiles * tile;
  const sign = '#5eead4';
  const doorSide = entity.doorSide || 'south';

  return (
    <div
      className="absolute z-10"
      style={{ left: entity.x * tile, top: entity.y * tile, width: w, height: h }}
    >
      {/* body */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to bottom, #2a1a4a 0%, #1a0a3d 100%)',
          border: '2px solid #5eead4',
          borderRadius: 3,
          boxShadow: '0 0 12px rgba(94,234,212,0.3), inset 0 0 8px rgba(0,0,0,0.5)',
        }}
      />
      {/* roof / top sign */}
      <div
        className="absolute left-0 right-0 flex items-center justify-center text-center"
        style={{
          top: 2,
          height: Math.max(8, Math.round(tile * 0.18)),
          background: '#fcd34d',
          color: '#0e2535',
          fontSize: Math.max(6, Math.round(tile * 0.11)),
          letterSpacing: '0.1em',
          fontWeight: 'bold',
          margin: '0 2px',
          borderRadius: 1,
        }}
      >
        PHONE
      </div>
      {/* window with phone */}
      <div
        className="absolute window-flicker flex items-center justify-center"
        style={{
          left: '12%',
          right: '12%',
          top: Math.round(tile * 0.32),
          bottom: Math.round(tile * 0.18),
          background: 'rgba(94,234,212,0.18)',
          border: '1px solid rgba(94,234,212,0.6)',
          borderRadius: 1,
          color: '#5eead4',
          fontSize: Math.max(10, Math.round(tile * 0.32)),
          textShadow: '0 0 6px rgba(94,234,212,0.6)',
        }}
      >
        ☎
      </div>
      {/* base panel */}
      <div
        className="absolute left-0 right-0 bottom-0"
        style={{
          height: Math.max(4, Math.round(tile * 0.1)),
          background: '#143849',
          borderTop: '1px solid rgba(0,0,0,0.4)',
        }}
      />
      <VisitPip adjacent={adjacent} solved={solved} sign={sign} doorSide={doorSide} tile={tile} label="CALL" />
    </div>
  );
}

// ---------- coin (pickup on the road) ----------

export function CoinSprite({ entity, tile }) {
  const coinSize = Math.max(6, Math.round(tile * 0.22));
  return (
    <div
      className="absolute z-10 flex items-center justify-center pointer-events-none"
      style={{ left: entity.x * tile, top: entity.y * tile, width: tile, height: tile }}
    >
      <div
        className="rounded-full lamp-pulse"
        style={{
          width: coinSize,
          height: coinSize,
          background: 'radial-gradient(circle at 35% 35%, #fff7d0, #fcd34d 60%, #b88a2a 100%)',
          border: '1px solid #6e4f1a',
          boxShadow: '0 0 6px rgba(252,211,77,0.55)',
        }}
      />
    </div>
  );
}

// ---------- cable car (overhead motion) ----------

export function CableCar({ tile, rowY = 1.2 }) {
  const cabinW = Math.round(tile * 1.1);
  const cabinH = Math.round(tile * 0.55);
  const top = Math.round(rowY * tile);
  return (
    <>
      {/* cable line (full room width) */}
      <div
        className="absolute pointer-events-none z-[18]"
        style={{
          left: 0,
          right: 0,
          top: top + 2,
          height: 1,
          background: 'rgba(252,211,77,0.45)',
          boxShadow: '0 0 3px rgba(252,211,77,0.4)',
        }}
      />
      {/* traveling cabin */}
      <div
        className="absolute pointer-events-none z-[19] cable-travel"
        style={{ top, transform: 'translateX(0)' }}
      >
        <div className="cable-bob relative" style={{ width: cabinW, height: cabinH }}>
          {/* pulley arm */}
          <div className="absolute left-1/2 -translate-x-1/2" style={{ top: -7, width: 2, height: 7, background: '#777' }} />
          <div className="absolute left-1/2 -translate-x-1/2" style={{ top: -10, width: Math.round(cabinW * 0.3), height: 3, background: '#555', borderRadius: 2 }} />
          {/* cabin body */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to bottom, #fcd34d, #e8b53d)',
              border: '2px solid #ff8a8a',
              borderRadius: 5,
              boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
            }}
          >
            {/* windows */}
            <div
              className="absolute flex gap-1"
              style={{ left: 4, right: 4, top: 3, height: Math.max(6, Math.round(cabinH * 0.4)) }}
            >
              <div className="flex-1 window-flicker rounded-sm" style={{ background: '#5eead4' }} />
              <div className="flex-1 window-flicker rounded-sm" style={{ background: '#5eead4', animationDelay: '0.6s' }} />
              <div className="flex-1 window-flicker rounded-sm" style={{ background: '#5eead4', animationDelay: '1.2s' }} />
            </div>
            {/* door line */}
            <div className="absolute left-1/2 bottom-0 -translate-x-1/2" style={{ width: 2, height: '40%', background: '#143849' }} />
          </div>
        </div>
      </div>
    </>
  );
}
