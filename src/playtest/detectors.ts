import type { BoardDefinition } from '../types/board-definition';
import type { GameState, BallState } from '../game/game-state';
import type { InputState } from '../input/keyboard-input';
import type { GameEvent } from '../game/rules-types';
import { getGuideDistance } from '../game/guide-geometry';
import type { Finding } from './artifact';

interface Sample {
  time: number;
  x: number;
  y: number;
  speed: number;
}
interface Window {
  samples: Sample[];
  emitted?: string;
  progress: number;
}
export const activeBalls = (state: GameState): BallState[] => [
  state.ball,
  ...state.additionalBalls,
];
export const closestComponents = (board: BoardDefinition, ball: BallState) => {
  let flipper: number | undefined,
    guide: number | undefined,
    fDistance = Infinity,
    gDistance = Infinity;
  board.flippers.forEach((f, i) => {
    const distance = Math.hypot(ball.position.x - f.x, ball.position.y - f.y);
    if (distance < fDistance && distance < f.length + ball.radius * 2) {
      fDistance = distance;
      flipper = i;
    }
  });
  board.guides.forEach((g, i) => {
    if ((g.plane ?? 'playfield') === 'raised') return;
    const distance = getGuideDistance(ball.position, g);
    if (distance < gDistance && distance < ball.radius * 3) {
      gDistance = distance;
      guide = i;
    }
  });
  return { flipper, guide };
};

/** Histories are sampled at 10 Hz; no rendering or contact tracing is needed. */
export class IssueDetector {
  private windows = new Map<number, Window>();
  private time = 0;
  private nextSample = 0;
  observe(
    state: GameState,
    board: BoardDefinition,
    input: InputState,
    dt: number,
    frame: number,
    events: GameEvent[] = [],
  ): Finding[] {
    this.time += dt;
    if (events.some((e) => e.type === 'ball-drained')) this.windows.clear();
    const balls = activeBalls(state);
    const ids = new Set(balls.map((b, i) => b.id ?? i));
    for (const id of this.windows.keys())
      if (!ids.has(id)) this.windows.delete(id);
    const findings: Finding[] = [];
    const sampled = this.time + 1e-8 >= this.nextSample;
    if (sampled) this.nextSample = this.time + 0.1;
    balls.forEach((ball, index) => {
      const id = ball.id ?? index;
      const finding = (code: Finding['code'], confirmed: boolean): Finding => ({
        code,
        frame,
        seconds: this.time,
        ballId: id,
        point: { ...ball.position },
        ...closestComponents(board, ball),
        confirmed,
        recovery: [],
      });
      const numbers = [
        ball.position.x,
        ball.position.y,
        ball.linearVelocity.x,
        ball.linearVelocity.y,
        ball.angularVelocity.x,
        ball.angularVelocity.y,
        ball.angularPosition.x,
        ball.angularPosition.y,
        ball.radius,
        ball.mass,
        ball.momentOfInertia,
        state.tableNudge.offset.x,
        state.tableNudge.offset.y,
        state.tableNudge.velocity.x,
        state.tableNudge.velocity.y,
        state.score,
        state.plunger.pullback,
        state.plunger.releaseSpeed,
        ...state.flippers.flatMap((f) => [f.angle, f.angularVelocity]),
      ];
      if (numbers.some((n) => !Number.isFinite(n))) {
        findings.push(finding('non-finite', true));
        return;
      }
      if (
        ball.position.x < -ball.radius - 5 ||
        ball.position.x > board.width + ball.radius + 5 ||
        ball.position.y < -ball.radius - 5
      ) {
        findings.push(finding('escaped-bounds', true));
        return;
      }
      const captured =
        ball.capturedSaucer !== undefined &&
        state.saucers[ball.capturedSaucer]?.occupied &&
        state.saucers[ball.capturedSaucer].holdSecondsRemaining > 0;
      if (
        state.status === 'game-over' ||
        (index === 0 && state.status === 'waiting-launch') ||
        captured
      ) {
        this.windows.delete(id);
        return;
      }
      const window = this.windows.get(id) ?? {
        samples: [],
        progress: this.time,
      };
      this.windows.set(id, window);
      if (
        events.some(
          (e) =>
            ('score' in e || e.type === 'ball-launched') &&
            (!('ballId' in e) || e.ballId === id),
        )
      )
        window.progress = this.time;
      if (!sampled) return;
      const speed = Math.hypot(ball.linearVelocity.x, ball.linearVelocity.y);
      window.samples.push({
        time: this.time,
        x: ball.position.x,
        y: ball.position.y,
        speed,
      });
      while (window.samples.length && this.time - window.samples[0].time > 6.1)
        window.samples.shift();
      const recent = window.samples.filter((s) => this.time - s.time <= 2.1);
      const span = (samples: Sample[], key: 'x' | 'y') =>
        Math.max(...samples.map((s) => s[key])) -
        Math.min(...samples.map((s) => s[key]));
      const stationary =
        recent.length >= 20 &&
        this.time - recent[0].time >= 1.95 &&
        recent.every((s) => s.speed < 5) &&
        span(recent, 'x') < ball.radius * 0.25 &&
        span(recent, 'y') < ball.radius * 0.25;
      const looping =
        window.samples.length >= 60 &&
        this.time - window.progress >= 6 &&
        span(window.samples, 'x') < ball.radius * 4 &&
        span(window.samples, 'y') < ball.radius * 8;
      const key = `${+input.leftPressed}:${+input.rightPressed}`;
      if (!stationary && !looping) {
        window.emitted = undefined;
        return;
      }
      if (window.emitted === key) return;
      window.emitted = key;
      findings.push(
        finding(stationary ? 'stationary-stall' : 'bounded-livelock', false),
      );
    });
    return findings;
  }
}
