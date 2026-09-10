import type { BoardDefinition } from '../types/board-definition';
import type { GameState } from '../game/game-state';

const label = (
  c: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size = 20,
) => {
  c.font = `700 ${size}px Georgia, serif`;
  c.textAlign = 'center';
  c.fillStyle = '#f7e5bb';
  c.fillText(text, x, y);
};

export const drawStarlightPlayfield = (
  c: CanvasRenderingContext2D,
  board: BoardDefinition,
): void => {
  c.save();
  c.fillStyle = '#142c40';
  c.fillRect(0, 0, board.width, board.height);
  // Printed celestial engraving: decorative lines never represent physical rails.
  c.strokeStyle = '#315467';
  c.lineWidth = 2;
  for (const radius of [170, 270, 380, 500]) {
    c.beginPath();
    c.arc(450, 470, radius, 0, Math.PI * 2);
    c.stroke();
  }
  for (let i = 0; i < 70; i++) {
    const x = 45 + ((i * 137) % 830),
      y = 80 + ((i * 193) % 1090);
    c.fillStyle = i % 3 ? '#567a86' : '#dab976';
    c.beginPath();
    c.arc(x, y, i % 3 ? 2 : 3, 0, Math.PI * 2);
    c.fill();
  }
  c.strokeStyle = '#bb9a60';
  c.lineWidth = 3;
  c.strokeRect(25, 65, 865, 1280);
  // An engraved compass rose in the open lower-middle field.
  c.save();
  c.translate(450, 980);
  for (let i = 0; i < 8; i++) {
    c.rotate(Math.PI / 4);
    c.beginPath();
    c.moveTo(0, -95);
    c.lineTo(13, -18);
    c.lineTo(0, 0);
    c.lineTo(-13, -18);
    c.closePath();
    c.fillStyle = i % 2 ? '#305567' : '#927e55';
    c.fill();
  }
  c.restore();
  label(c, 'COMET', 245, 685, 24);
  label(c, 'NOVA', 710, 760, 24);
  label(c, 'OBSERVATORY', 750, 295, 18);
  label(c, 'LIGHT BOTH BANKS', 750, 320, 13);
  label(c, 'CONSTELLATION', 450, 1065, 24);
  c.restore();
};

export const drawStarlightInserts = (
  c: CanvasRenderingContext2D,
  board: BoardDefinition,
  state?: GameState,
): void => {
  const values = state?.rules.ballValues ?? {};
  const player = state?.rules.playerValues ?? {};
  const lamp = (
    x: number,
    y: number,
    lit: boolean,
    color = '#f6ce73',
    radius = 12,
  ) => {
    c.beginPath();
    c.arc(x, y, radius, 0, Math.PI * 2);
    c.fillStyle = lit ? color : '#243c46';
    c.fill();
    c.strokeStyle = lit ? '#fff3ce' : '#8a815f';
    c.lineWidth = 2;
    c.stroke();
  };
  c.save();
  board.bumpers.forEach((bumper) => {
    c.font = '700 20px Georgia, serif';
    c.textAlign = 'center';
    c.fillStyle = '#192e43';
    c.fillText(
      values['star-complete'] ? '1000' : '100',
      bumper.x,
      bumper.y + 7,
    );
  });
  board.rollovers.forEach((lane, i) => {
    lamp(lane.x, lane.y + 65, !!(Number(values.star) & (1 << i)));
    label(c, 'STAR'[i], lane.x, lane.y + 105, 25);
  });
  board.standupTargets.forEach((target, i) => {
    const key = i < 3 ? 'comet' : 'nova';
    lamp(
      target.x + (i < 3 ? -45 : 45),
      target.y,
      !!(Number(values[key]) & (1 << (i % 3))),
      i < 3 ? '#78d5c0' : '#ef987a',
    );
  });
  board.spinners.forEach((spinner, i) => {
    const lit = !!values[i === 0 ? 'comet-lit' : 'nova-lit'];
    lamp(spinner.x, spinner.y + 48, lit, i === 0 ? '#78d5c0' : '#ef987a');
    label(
      c,
      `${lit ? (i === 0 ? '500' : '1,000') : '100'} / SPIN`,
      spinner.x,
      spinner.y + 82,
      17,
    );
  });
  const ready = !!values['comet-lit'] && !!values['nova-lit'];
  lamp(685, 450, ready, '#f6ce73', 18);
  const award = Math.min(
    25000,
    10000 + Number(player.constellations || 0) * 5000,
  );
  label(c, ready ? `${award.toLocaleString()} LIT` : '3,000', 685, 493, 22);
  lamp(385, 1100, !!values['comet-lit'], '#78d5c0');
  lamp(515, 1100, !!values['nova-lit'], '#ef987a');
  label(
    c,
    `${(state?.rules.bonus ?? 0).toLocaleString()} BONUS × ${state?.rules.bonusMultiplier ?? 1}`,
    450,
    1148,
    21,
  );
  label(
    c,
    player['extra-ball-awarded']
      ? 'EXTRA BALL AWARDED'
      : ready && values['star-complete']
        ? 'SHOOT SAUCER • EXTRA BALL LIT'
        : 'STAR + BOTH BANKS → EXTRA BALL',
    450,
    1180,
    16,
  );
  label(
    c,
    values['star-complete'] ? 'POPS 1,000' : 'COMPLETE STAR • LIGHT POPS',
    450,
    540,
    17,
  );
  c.restore();
};
