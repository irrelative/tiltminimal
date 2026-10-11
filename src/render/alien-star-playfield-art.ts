import type { BoardDefinition } from '../types/board-definition';
import type { GameState } from '../game/game-state';

const text = (
  c: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  size = 18,
) => {
  c.font = `bold ${size}px sans-serif`;
  c.textAlign = 'center';
  c.fillStyle = '#ffe15d';
  c.fillText(label, x, y);
};
const lamp = (
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  lit: boolean,
  color = '#ffdf52',
  radius = 17,
) => {
  c.beginPath();
  c.arc(x, y, radius, 0, 2 * Math.PI);
  c.fillStyle = lit ? color : '#172d30';
  c.fill();
  c.strokeStyle = lit ? '#fff4ce' : '#8b6229';
  c.lineWidth = 3;
  c.stroke();
};

/** Original vector artwork informed by the reference's black/cyan/orange palette. */
export const drawAlienStarPlayfield = (
  c: CanvasRenderingContext2D,
  board: BoardDefinition,
): void => {
  c.save();
  c.fillStyle = '#080f14';
  c.fillRect(0, 0, board.width, board.height);
  for (let i = 0; i < 320; i++) {
    c.fillStyle = i % 9 ? '#19758a' : '#cbeae3';
    c.fillRect(
      22 + ((i * 137) % 850),
      35 + ((i * 193) % 1430),
      i % 9 ? 2 : 3,
      2,
    );
  }
  // Alien constellation, decorative and deliberately distinct from physical rails.
  c.strokeStyle = '#168ca4';
  c.lineWidth = 4;
  const paths = [
    [
      [430, 650],
      [355, 705],
      [335, 810],
      [390, 850],
      [510, 850],
      [565, 810],
      [545, 705],
      [470, 650],
    ],
    [
      [365, 720],
      [425, 745],
      [450, 720],
      [475, 745],
      [535, 720],
    ],
    [
      [390, 850],
      [290, 960],
      [250, 1170],
      [420, 1050],
      [650, 1170],
      [610, 960],
      [510, 850],
    ],
    [
      [290, 960],
      [505, 1025],
      [610, 960],
    ],
    [
      [250, 1170],
      [400, 1090],
      [440, 1300],
    ],
    [
      [650, 1170],
      [500, 1090],
      [460, 1300],
    ],
  ];
  for (const path of paths) {
    c.beginPath();
    path.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.stroke();
  }
  for (const x of [400, 500]) {
    c.fillStyle = '#a9d7d1';
    c.beginPath();
    c.ellipse(x, 773, 22, 8, 0, 0, Math.PI * 2);
    c.fill();
  }
  text(c, 'ALIEN STAR', 450, 1550, 42);
  text(c, '1984 · GOTTLIEB', 450, 1580, 14);
  text(c, 'SPINNER', 136, 490, 16);
  text(c, '10,000 WHEN LIT', 150, 520, 14);
  text(c, 'BONUS X SHOT', 760, 560, 15);
  text(c, 'CAPTURE WHEN LIT', 140, 680, 14);
  text(c, 'MULTIBALL X', 240, 1100, 13);
  for (const [i, target] of board.standupTargets.slice(0, 5).entries())
    text(c, 'ALIEN'[i], target.x - 60, target.y + 6, 25);
  text(c, 'HOLD BONUS', 450, 1390, 14);
  c.restore();
};

export const drawAlienStarInserts = (
  c: CanvasRenderingContext2D,
  board: BoardDefinition,
  state?: GameState,
): void => {
  c.save();
  const v = state?.rules.ballValues ?? {},
    p = state?.rules.playerValues ?? {};
  const awards = Number(v.awards || 0),
    star = Number(v.star || 0);
  const names = ['COLLECT BONUS', 'ADVANCE X', 'HOLD BONUS', 'EXTRA BALL'];
  board.rollovers.slice(0, 4).forEach((r, i) => {
    lamp(c, r.x, r.y, Boolean(star & (1 << i)));
    text(c, 'STAR'[i], r.x, r.y + 6, 20);
    lamp(
      c,
      r.x,
      r.y + 67,
      Boolean(awards & (1 << i)),
      i === 3 ? '#da82c9' : '#ffe36e',
    );
    text(c, names[i], r.x, r.y + 98, 11);
  });
  board.standupTargets
    .slice(0, 5)
    .forEach((t, i) =>
      lamp(
        c,
        t.x - 60,
        t.y - 28,
        Boolean(Number(p.alien || 0) & (1 << i)),
        '#ffa338',
        10,
      ),
    );
  lamp(c, 184, 821, Boolean(p['lock-lit']), '#fff265', 14);
  [2, 3, 5].forEach((x, i) => {
    const chosen =
      v.phase === 'single' || !v.phase
        ? [2, 3, 5][Number(p.selector || 0)]
        : v['locked-x'];
    lamp(c, 215, 1050 - i * 50, chosen === x);
    text(c, `${x}X`, 215, 1056 - i * 50, 18);
    if (chosen === x) {
      c.fillStyle = '#10242b';
      c.fillText(`${x}X`, 215, 1056 - i * 50);
    }
  });
  lamp(c, 136, 465, Boolean(state?.rules.modes['spinner-lit']), '#ffd953', 12);
  lamp(
    c,
    765,
    610,
    Boolean(state?.rules.modes['advance-bonus']),
    '#ffd953',
    12,
  );
  lamp(c, 450, 1360, Boolean(v['hold-bonus']), '#ffd953', 14);
  const bonus = state?.rules.bonus ?? 1000;
  text(c, `BONUS ${bonus.toLocaleString()}`, 450, 1130, 22);
  text(c, `${state?.rules.bonusMultiplier ?? 1}X BONUS`, 450, 1160, 16);
  if (v.phase === 'locked') text(c, 'PLUNGE FOR MULTIBALL', 450, 1230, 24);
  if (v.phase === 'multiball')
    text(c, `${v['playfield-x']}X MULTIBALL`, 450, 1230, 28);
  for (const r of board.rollovers.slice(4))
    lamp(
      c,
      r.x,
      r.y,
      Boolean(v.special && board.rollovers.indexOf(r) >= 6),
      '#ee6941',
      13,
    );
  c.restore();
};
