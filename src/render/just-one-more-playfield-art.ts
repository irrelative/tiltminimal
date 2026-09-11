import type { BoardDefinition } from '../types/board-definition';
import type { GameState } from '../game/game-state';

const ink = '#fff0d6',
  orange = '#ff713e',
  muted = '#bcaf9b';
function text(
  c: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  size = 18,
  color = ink,
) {
  c.fillStyle = color;
  c.font = `700 ${size}px sans-serif`;
  c.fillText(label, x, y);
}
function upvote(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  lit: boolean,
) {
  c.beginPath();
  c.moveTo(x, y - 20);
  c.lineTo(x + 20, y);
  c.lineTo(x + 9, y);
  c.lineTo(x + 9, y + 18);
  c.lineTo(x - 9, y + 18);
  c.lineTo(x - 9, y);
  c.lineTo(x - 20, y);
  c.closePath();
  c.fillStyle = lit ? orange : '#394348';
  c.fill();
  c.strokeStyle = orange;
  c.lineWidth = 2;
  c.stroke();
}
export function drawJustOneMorePlayfield(
  c: CanvasRenderingContext2D,
  board: BoardDefinition,
) {
  c.save();
  c.fillStyle = '#202c34';
  c.fillRect(0, 0, board.width, board.height);
  c.textAlign = 'center';
  // Basement floor plan: printed, faint dashed outlines, never physical guides.
  c.strokeStyle = '#687075';
  c.lineWidth = 2;
  c.setLineDash([5, 7]);
  c.strokeRect(355, 750, 190, 65);
  c.beginPath();
  c.moveTo(355, 750);
  c.lineTo(545, 815);
  c.moveTo(545, 750);
  c.lineTo(355, 815);
  c.stroke();
  c.setLineDash([]);
  text(c, 'COUCH GOES HERE?', 450, 790, 14, muted);
  text(c, 'r/pinball', 450, 330, 24, orange);
  text(c, 'NEW PIN DAY', 480, 562, 23);
  text(c, 'COLLECT / LOCK', 480, 585, 13, muted);
  text(c, 'JUST A FUSE', 319, 680, 17, orange);
  text(c, 'ONE MORE FIX', 577, 680, 17, orange);
  text(c, 'ARCADE', 177, 781, 18);
  text(c, 'ROAD TRIP', 722, 781, 18);
  text(c, 'JUST ONE MORE', 450, 970, 42);
  text(c, 'THERE’S ROOM IF YOU MOVE THE COUCH', 450, 1000, 13, muted);
  c.restore();
}
export function drawJustOneMoreInserts(
  c: CanvasRenderingContext2D,
  _board: BoardDefinition,
  state?: GameState,
) {
  const v = state?.rules.ballValues ?? {};
  const multiball = v.phase === 'multiball',
    locked = v.phase === 'locked';
  const play = Number(v.play || 0),
    fix = Number(v.fix || 0),
    jackpots = Number(v.jackpots || 0);
  const ready = play === 3 && fix === 15;
  c.save();
  c.textAlign = 'center';
  for (const [i, x] of [177, 722].entries()) {
    upvote(
      c,
      x,
      734,
      multiball ? !!(jackpots & (1 << i)) : !!(play & (1 << i)),
    );
  }
  // Each repair gets a persistent progress lamp beside its actual target.
  const repairs = [
    { x: 244, y: 586, name: 'FUSE' },
    { x: 307, y: 646, name: 'SWITCH' },
    { x: 667, y: 586, name: 'COIL' },
    { x: 603, y: 646, name: 'RUBBER' },
  ];
  repairs.forEach((r, i) =>
    text(
      c,
      `${fix & (1 << i) ? '●' : '○'} ${r.name}`,
      r.x,
      r.y,
      12,
      fix & (1 << i) ? orange : muted,
    ),
  );
  const stages = [
    { x: 340, name: 'PLAY', lit: play === 3 },
    { x: 450, name: 'FIX', lit: fix === 15 },
    { x: 560, name: 'COLLECT', lit: ready || locked || multiball },
  ];
  stages.forEach((s) => {
    upvote(c, s.x, 865, s.lit);
    text(c, s.name, s.x, 906, 17);
  });
  text(
    c,
    locked
      ? 'PLUNGE FOR TWO-BALL MULTIBALL'
      : multiball
        ? jackpots === 3
          ? 'NEW PIN DAY • JACKPOT 10,000'
          : 'BOTH SPINNERS LIGHT JACKPOT'
        : ready
          ? 'NEW PIN DAY • LOCK LIT'
          : 'BOTH SPINNERS + FOUR REPAIR TARGETS',
    450,
    1050,
    17,
    orange,
  );
  text(
    c,
    multiball ? 'YOU SAID THIS WAS THE LAST ONE.' : 'PLAY • FIX • COLLECT',
    450,
    1080,
    13,
    muted,
  );
  c.restore();
}
