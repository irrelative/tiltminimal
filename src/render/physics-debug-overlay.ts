import type { BallState, GameState } from '../game/game-state';
import type { PhysicsDebug } from '../game/physics-debug';
import type { BoardDefinition, Point } from '../types/board-definition';
import {
  getSlingshotAngle,
  getSlingshotRubberRadius,
  getSlingshotVertices,
} from '../game/slingshot-geometry';
import { getArcGuideSweep } from '../game/guide-geometry';
import {
  getPlungerGuideSegments,
  getPlungerReturnGate,
} from '../game/plunger-geometry';
import { traceFlipperPath, traceSlingshotPath } from './canvas-renderer-shared';

export const drawPhysicsDebug = (
  c: CanvasRenderingContext2D,
  board: BoardDefinition,
  state: GameState,
  balls: BallState[],
  debug?: PhysicsDebug,
): void => {
  if (!debug?.enabled) return;
  const circle = (p: Point, radius: number) => {
    c.beginPath();
    c.arc(p.x, p.y, radius, 0, Math.PI * 2);
    c.stroke();
  };
  const capsule = (
    x: number,
    y: number,
    length: number,
    thickness: number,
    angle: number,
  ) => {
    c.save();
    c.translate(x, y);
    c.rotate(angle);
    c.beginPath();
    c.moveTo(-length / 2, -thickness / 2);
    c.lineTo(length / 2, -thickness / 2);
    c.arc(length / 2, 0, thickness / 2, -Math.PI / 2, Math.PI / 2);
    c.lineTo(-length / 2, thickness / 2);
    c.arc(-length / 2, 0, thickness / 2, Math.PI / 2, Math.PI * 1.5);
    c.closePath();
    c.stroke();
    c.restore();
  };
  c.save();
  c.lineWidth = 2;
  c.strokeStyle = '#4ff5ff';
  c.translate(state.tableNudge.offset.x, state.tableNudge.offset.y);
  c.beginPath();
  c.moveTo(0, board.height);
  c.lineTo(0, 0);
  c.lineTo(board.width, 0);
  c.lineTo(board.width, board.height);
  c.stroke();
  const gate = getPlungerReturnGate(board);
  const guides = [
    ...board.guides,
    ...(!state.launcherExited || gate ? getPlungerGuideSegments(board) : []),
    ...(gate && state.launcherExited ? [gate] : []),
  ];
  for (const g of guides) {
    if (g.plane === 'raised') continue;
    if (g.kind === 'arc') {
      const end = g.startAngle + getArcGuideSweep(g),
        r = g.thickness / 2;
      c.beginPath();
      c.arc(g.center.x, g.center.y, g.radius + r, g.startAngle, end);
      c.arc(
        g.center.x + Math.cos(end) * g.radius,
        g.center.y + Math.sin(end) * g.radius,
        r,
        end,
        end + Math.PI,
      );
      c.arc(
        g.center.x,
        g.center.y,
        Math.max(0, g.radius - r),
        end,
        g.startAngle,
        true,
      );
      c.arc(
        g.center.x + Math.cos(g.startAngle) * g.radius,
        g.center.y + Math.sin(g.startAngle) * g.radius,
        r,
        g.startAngle + Math.PI,
        g.startAngle + 2 * Math.PI,
      );
      c.stroke();
    } else
      capsule(
        (g.start.x + g.end.x) / 2,
        (g.start.y + g.end.y) / 2,
        Math.hypot(g.end.x - g.start.x, g.end.y - g.start.y),
        g.thickness,
        Math.atan2(g.end.y - g.start.y, g.end.x - g.start.x),
      );
  }
  [...board.posts, ...board.bumpers].forEach((p) => circle(p, p.radius));
  [
    ...board.standupTargets,
    ...board.dropTargets.filter((_, i) => !state.dropTargets[i].isDown),
  ].forEach((p) => capsule(p.x, p.y, p.width, p.height, p.angle));
  board.flippers.forEach((f, i) => {
    c.save();
    c.translate(f.x, f.y);
    c.rotate(state.flippers[i].angle);
    traceFlipperPath(c, f);
    c.stroke();
    c.restore();
  });
  board.slingshots.forEach((s) => {
    c.save();
    c.translate(s.x, s.y);
    c.rotate(getSlingshotAngle(board, s));
    traceSlingshotPath(c, s.width, s.height, s.backOutline);
    c.lineWidth = s.backOutline ? 2 : getSlingshotRubberRadius(s) * 2;
    c.lineJoin = 'round';
    c.globalAlpha = 0.4;
    c.stroke();
    const vertices = getSlingshotVertices(s.width, s.height, s.backOutline);
    for (const edge of [0, ...(s.rubberEdges ?? [])]) {
      const start = vertices[edge],
        end = vertices[(edge + 1) % vertices.length];
      c.beginPath();
      c.moveTo(start.x, start.y);
      c.lineTo(end.x, end.y);
      c.lineWidth = getSlingshotRubberRadius(s) * 2;
      c.lineCap = 'round';
      c.stroke();
    }
    c.globalAlpha = 1;
    c.lineWidth = 2;
    circle({ x: -s.width / 2, y: 0 }, getSlingshotRubberRadius(s));
    circle({ x: s.width / 2, y: 0 }, getSlingshotRubberRadius(s));
    c.strokeStyle = '#ffdb61';
    c.beginPath();
    c.moveTo(
      -s.width / 2 + getSlingshotRubberRadius(s),
      -getSlingshotRubberRadius(s),
    );
    c.lineTo(
      s.width / 2 - getSlingshotRubberRadius(s),
      -getSlingshotRubberRadius(s),
    );
    c.stroke();
    c.restore();
  });
  capsule(
    board.plunger.x,
    board.plunger.y + state.plunger.pullback,
    board.plunger.length,
    board.plunger.thickness,
    Math.PI / 2,
  );
  c.strokeStyle = '#ffdb61';
  c.setLineDash([7, 5]);
  board.rollovers.forEach((p) => circle(p, p.radius + board.ball.radius * 0.3));
  board.saucers.forEach((p) =>
    circle(p, Math.max(0, p.radius - board.ball.radius * 0.15)),
  );
  board.spinners.forEach((p, i) =>
    capsule(p.x, p.y, p.length, p.thickness, p.angle + state.spinners[i].angle),
  );
  c.restore();
  c.save();
  c.lineWidth = 2;
  c.font = '18px monospace';
  balls.forEach((ball) => {
    c.strokeStyle = '#a9ff72';
    c.fillStyle = '#a9ff72';
    circle(ball.position, ball.radius);
    c.beginPath();
    c.moveTo(ball.position.x, ball.position.y);
    c.lineTo(
      ball.position.x + ball.linearVelocity.x * 0.12,
      ball.position.y + ball.linearVelocity.y * 0.12,
    );
    c.stroke();
    c.fillText(
      `${Math.round(Math.hypot(ball.linearVelocity.x, ball.linearVelocity.y))} u/s`,
      Math.min(board.width - 120, ball.position.x + 20),
      Math.max(24, ball.position.y - 20),
    );
  });
  c.strokeStyle = '#ff6aa9';
  debug.contacts.forEach((contact) => {
    c.globalAlpha = Math.max(0.15, 1 - (debug.time - contact.time) / 0.4);
    circle(contact.point, 4);
    c.beginPath();
    c.moveTo(contact.point.x, contact.point.y);
    c.lineTo(
      contact.point.x + contact.normal.x * 45,
      contact.point.y + contact.normal.y * 45,
    );
    c.stroke();
  });
  c.restore();
};
