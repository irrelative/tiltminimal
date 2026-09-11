import type { GameState } from '../game/game-state';

export function drawSoftPlungeInsert(
  c: CanvasRenderingContext2D,
  state?: GameState,
) {
  const phase = state?.rules.ballValues['skill-shot'];
  const lit = phase === 'ready' || phase === 'armed';
  c.save();
  c.beginPath();
  c.arc(738, 225, 10, 0, Math.PI * 2);
  c.fillStyle = lit ? '#ffd16b' : '#374550';
  c.fill();
  c.strokeStyle = '#d6b579';
  c.lineWidth = 2;
  c.stroke();
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.font = '700 13px sans-serif';
  c.fillStyle = lit ? '#fff0d6' : '#89959b';
  c.fillText('SKILL SHOT', 738, 253);
  c.font = '12px sans-serif';
  c.fillText(phase === 'collected' ? '5,000 MADE' : '5,000', 738, 270);
  c.restore();
}
