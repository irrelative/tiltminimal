import { drawSoftPlungeInsert } from './soft-plunge-insert';
import type { BoardDefinition } from '../types/board-definition';
import type { GameState } from '../game/game-state';
const shots = [
  { x: 180, y: 790, name: 'WEST', color: '#67d5c4', bit: 0 },
  { x: 340, y: 770, name: 'CARGO', color: '#f0b759', bit: 1 },
  { x: 380, y: 505, name: 'DISPATCH', color: '#e6edf4', bit: 4 },
  { x: 500, y: 630, name: 'SIGNAL', color: '#ed8c9c', bit: 2 },
  { x: 710, y: 790, name: 'EAST', color: '#80b8f2', bit: 3 },
];
export function drawSwitchyardPlayfield(
  c: CanvasRenderingContext2D,
  board: BoardDefinition,
) {
  c.save();
  c.fillStyle = '#101e29';
  c.fillRect(0, 0, board.width, board.height);
  c.strokeStyle = '#203541';
  c.lineWidth = 1;
  for (let y = 300; y < 1200; y += 80) {
    c.beginPath();
    c.moveTo(180, y);
    c.lineTo(730, y);
    c.stroke();
  }
  // Printed transit lines only: short dashes keep them distinct from solid rails.
  c.setLineDash([3, 12]);
  c.lineWidth = 2;
  shots.forEach((shot) => {
    c.strokeStyle = shot.color;
    c.globalAlpha = 0.18;
    c.beginPath();
    c.moveTo(450, 1020);
    c.lineTo(shot.x, shot.y + 60);
    c.stroke();
  });
  c.setLineDash([]);
  c.globalAlpha = 1;
  c.font = '700 38px sans-serif';
  c.textAlign = 'center';
  c.fillStyle = '#a0b8c4';
  c.fillText('SWITCHYARD', 450, 950);
  c.font = '13px sans-serif';
  c.fillStyle = '#77909e';
  c.fillText('CONNECT THE NETWORK', 450, 978);
  c.restore();
}
export function drawSwitchyardInserts(
  c: CanvasRenderingContext2D,
  _board: BoardDefinition,
  state?: GameState,
) {
  drawSoftPlungeInsert(c, state);
  const values = state?.rules.ballValues ?? {};
  const phase = values.phase ?? 'qualify';
  const network = Number(values.network || 0),
    jackpots = Number(values.jackpots || 0);
  c.save();
  c.textAlign = 'center';
  shots.forEach((shot) => {
    const lit =
      phase === 'multiball'
        ? shot.bit === 4
          ? jackpots === 15
          : !(jackpots & (1 << shot.bit))
        : !!(network & (1 << shot.bit));
    c.fillStyle = lit ? shot.color : '#293b48';
    c.strokeStyle = shot.color;
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(shot.x, shot.y - 18);
    c.lineTo(shot.x + 12, shot.y + 6);
    c.lineTo(shot.x - 12, shot.y + 6);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = shot.color;
    c.font = '700 17px sans-serif';
    c.fillText(shot.name, shot.x, shot.y + 32);
    c.font = '12px sans-serif';
    const detail =
      phase === 'multiball'
        ? shot.bit === 4
          ? jackpots === 15
            ? 'SUPER 50,000'
            : 'COLLECT FOUR'
          : lit
            ? 'JACKPOT 10,000'
            : 'COLLECTED'
        : shot.bit === 4 && network === 31
          ? 'LOCK LIT'
          : lit
            ? 'CONNECTED'
            : shot.bit === 0
              ? 'FULL ORBIT'
              : shot.bit === 3
                ? 'SHORT LOOP'
                : shot.bit === 4
                  ? 'CONTROL'
                  : shot.bit === 1
                    ? 'DROP ALL 3'
                    : 'HIT BOTH';
    c.fillText(detail, shot.x, shot.y + 51);
  });
  c.fillStyle = '#e6edf4';
  c.font = '700 18px sans-serif';
  c.fillText(
    phase === 'locked'
      ? 'PLUNGE TO START MULTIBALL'
      : phase === 'multiball'
        ? jackpots === 15
          ? 'DISPATCH • SUPER JACKPOT LIT'
          : 'COLLECT THE FOUR JACKPOTS'
        : network === 31
          ? 'SHOOT DISPATCH TO LOCK'
          : 'CONNECT ALL FIVE ROUTES • LIGHT LOCK',
    450,
    1040,
  );
  c.font = '14px sans-serif';
  c.fillStyle = '#a0b8c4';
  c.fillText(`${(state?.rules.bonus ?? 0).toLocaleString()} BONUS`, 450, 1072);
  if (state?.rules.modes.combo)
    c.fillText(
      `COMBO • DIFFERENT ROUTE • ${(state.rules.modes.combo.timeRemainingMs / 1000).toFixed(1)}s`,
      450,
      1100,
    );
  c.restore();
}
