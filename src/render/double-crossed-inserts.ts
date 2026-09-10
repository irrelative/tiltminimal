import type { BoardDefinition } from '../types/board-definition';
import type { GameState } from '../game/game-state';

export const drawDoubleCrossedInserts = (
  c: CanvasRenderingContext2D,
  board: BoardDefinition,
  state?: GameState,
): void => {
  const v = state?.rules.ballValues ?? {};
  const phase = v['cross-phase'];
  const ready = !!v['cross-left'] && !!v['cross-right'];
  const spins = Number(v['cross-spinners'] || 0);
  const jackpot = Math.min(
    20000,
    10000 + Number(v['cross-jackpots'] || 0) * 5000,
  );
  const text = (s: string, x: number, y: number, size = 20) => {
    c.font = `700 ${size}px Futura, sans-serif`;
    c.fillStyle = '#fff1cc';
    c.textAlign = 'center';
    c.fillText(s, x, y);
  };
  const lamp = (x: number, y: number, on: boolean, color = '#ffcd69') => {
    c.beginPath();
    c.arc(x, y, 12, 0, Math.PI * 2);
    c.fillStyle = on ? color : '#20333f';
    c.fill();
    c.strokeStyle = on ? '#fff3c9' : '#8aa2aa';
    c.lineWidth = 2;
    c.stroke();
  };
  c.save();
  const cup = board.saucers[0];
  text('CROSS LOCK', cup.x, cup.y + 185, 23);
  for (const [i, x] of [260, 640].entries()) {
    lamp(x, 575, !!v[i === 0 ? 'cross-left' : 'cross-right']);
    text('CROSS', x, 548, 19);
  }
  board.spinners.forEach((spinner, i) => {
    lamp(
      spinner.x,
      spinner.y + 48,
      phase === 'multiball' && !!(spins & (1 << i)),
      '#72e0d3',
    );
    text('JACKPOT', spinner.x, spinner.y + 80, 15);
  });
  const lit = phase === 'multiball' ? spins === 3 : ready;
  lamp(cup.x, cup.y + 105, lit);
  text(
    phase === 'locked'
      ? 'LOCKED'
      : phase === 'multiball' && spins === 3
        ? `${jackpot.toLocaleString()} JACKPOT`
        : ready
          ? 'LOCK • 5,000'
          : '1,000',
    cup.x,
    cup.y + 145,
    20,
  );
  const instruction =
    phase === 'locked'
      ? 'BALL LOCKED • PLUNGE FOR MULTIBALL'
      : phase === 'multiball'
        ? spins === 3
          ? 'SHOOT CROSS JACKPOT'
          : spins === 1
            ? 'SHOOT RIGHT SPINNER'
            : spins === 2
              ? 'SHOOT LEFT SPINNER'
              : 'SHOOT BOTH SPINNERS'
        : ready
          ? 'SHOOT THE LIT LOCK'
          : 'COMPLETE BOTH CROSS BANKS';
  text(instruction, 450, 890, 20);
  if (phase === 'multiball') text('2 BALL MULTIBALL', 450, 925, 17);
  c.restore();
};
