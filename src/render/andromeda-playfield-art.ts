import type { GameState } from '../game/game-state';

// Original vector artwork inspired by the reference's warm cosmic palette.
export function drawAndromedaPlayfield(
  c: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  c.save();
  c.scale(width / 1000, height / 1800);
  const gradient = c.createLinearGradient(0, 0, 1000, 1800);
  gradient.addColorStop(0, '#151225');
  gradient.addColorStop(0.48, '#743428');
  gradient.addColorStop(1, '#131626');
  c.fillStyle = gradient;
  c.fillRect(0, 0, 1000, 1800);
  for (let i = 0; i < 180; i++) {
    const x = (i * 173 + 29) % 1000,
      y = (i * 317 + 13) % 1800;
    c.fillStyle = i % 3 ? '#f3bf7955' : '#ffedd899';
    c.beginPath();
    c.arc(x, y, i % 4 === 0 ? 2.3 : 1, 0, Math.PI * 2);
    c.fill();
  }
  c.strokeStyle = '#f1aa6066';
  c.lineWidth = 3;
  for (let i = 0; i < 7; i++) {
    c.beginPath();
    c.ellipse(460, 1080, 170 + i * 24, 270 + i * 26, -0.48, 0, Math.PI * 2);
    c.stroke();
  }
  c.fillStyle = '#190e2399';
  c.beginPath();
  c.moveTo(450, 740);
  c.lineTo(590, 1120);
  c.lineTo(450, 1280);
  c.lineTo(310, 1120);
  c.closePath();
  c.fill();
  c.strokeStyle = '#edab69';
  c.lineWidth = 5;
  c.stroke();
  c.font = '700 43px Futura, sans-serif';
  c.fillStyle = '#ffe3b5';
  c.textAlign = 'center';
  c.fillText('ANDROMEDA', 470, 1185);
  c.font = '500 17px Futura, sans-serif';
  c.fillText('A NEW GENERATION', 470, 1214);
  c.font = '700 19px Futura, sans-serif';
  for (const [text, x, y] of [
    ['LOCK · 30,000', 110, 285],
    ['5,000', 110, 588],
    ['SPINNER', 245, 570],
    ['POWER', 170, 1390],
    ['3,000 EACH', 380, 790],
    ['3,000 EACH', 690, 630],
    ['20,000', 833, 925],
    ['20,000', 833, 1115],
    ['EXTRA', 760, 1410],
    ['SPECIAL', 851, 1410],
  ] as const)
    c.fillText(text, x, y);
  c.fillStyle = '#ffde80';
  c.fillText('RELEASE', 460, 1070);
  c.fillText('2-BALL · 2×', 460, 1095);
  c.fillStyle = '#fff0cf';
  ['A', 'B', 'C'].forEach((label, i) => c.fillText(label, 340 + i * 110, 265));
  c.font = '600 18px Futura, sans-serif';
  c.fillText('RIGHT FLIPPER SHIFTS LANES', 480, 300);
  for (let i = 0; i < 10; i++) {
    const x = 450,
      y = 1270 + i * 25;
    c.fillStyle = '#e6ae57';
    c.beginPath();
    c.ellipse(x, y, 22, 9, 0, 0, Math.PI * 2);
    c.fill();
  }
  c.strokeStyle = '#e79c5266';
  c.lineWidth = 8;
  c.beginPath();
  c.moveTo(60, 1600);
  c.lineTo(450, 1750);
  c.lineTo(850, 1600);
  c.stroke();
  c.restore();
}

export function drawAndromedaInserts(
  c: CanvasRenderingContext2D,
  state: GameState,
): void {
  const lamp = (x: number, y: number, lit: boolean) => {
    c.fillStyle = lit ? '#fff495' : '#53352d';
    c.strokeStyle = '#efb568';
    c.lineWidth = 2;
    c.beginPath();
    c.ellipse(x, y, 16, 10, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();
  };
  lamp(
    460,
    1115,
    state.lockedBalls.length > 0 || Boolean(state.rules.ballValues.multiball),
  );
  lamp(832, 995, Boolean(state.rules.ballValues.upperLane));
  lamp(832, 1185, Boolean(state.rules.ballValues.lowerLane));
  lamp(770, 1435, Boolean(state.rules.ballValues.extraLit));
  lamp(850, 1435, Boolean(state.rules.ballValues.specialLit));
}
