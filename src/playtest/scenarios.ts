import type { BuiltInTable } from '../boards/table-library';
import { createInitialGameState } from '../game/game-state';
import { initializeRulesState } from '../game/rules-engine';
import { getPhysicsSandboxSpawnBlockedReason } from '../game/physics-sandbox';
import { createSeededRandom } from './classic-playtest';
import { idle, type Controller } from './simulation';

export interface Scenario {
  id: string;
  seed: number;
  initialState: ReturnType<typeof createInitialGameState>;
  controller: Controller;
  seconds: number;
  skip?: string;
  suite: 'game' | 'lip';
}
export const tableSeed = (name: string, seed: number): number => {
  for (const c of name) seed = Math.imul(seed ^ c.charCodeAt(0), 16777619);
  return seed >>> 0;
};
export const createTableController = (
  table: BuiltInTable,
  seed: number,
  hz = 60,
): Controller => {
  const random = createSeededRandom(seed);
  let charging = 0,
    chargeTarget = 0;
  const until = { left: 0, right: 0 },
    ready = { left: 0, right: 0 };
  return (state, frame) => {
    if (state.status === 'waiting-launch') {
      chargeTarget ||= Math.ceil(
        table.board.physics.plunger.maxPullSeconds *
          (0.55 + random() * 0.45) *
          hz,
      );
      return { ...idle, launchPressed: charging++ < chargeTarget };
    }
    charging = chargeTarget = 0;
    for (const ball of [state.ball, ...state.additionalBalls]) {
      if (ball.linearVelocity.y <= 0 || ball.capturedSaucer !== undefined)
        continue;
      for (const f of table.board.flippers) {
        if (
          Math.abs(ball.position.x - f.x) > f.length + ball.radius * 2 ||
          ball.position.y < f.y - ball.radius * 6 ||
          ball.position.y > f.y + ball.radius * 1.5 ||
          frame < ready[f.side]
        )
          continue;
        until[f.side] = frame + Math.ceil(hz * (0.1 + random() * 0.2));
        ready[f.side] = until[f.side] + Math.ceil(hz * 0.2);
      }
    }
    return {
      ...idle,
      leftPressed: frame < until.left,
      rightPressed: frame < until.right,
    };
  };
};
export function* scenarios(
  table: BuiltInTable,
  seed: number,
  deep = false,
  games = deep ? 64 : 8,
): Generator<Scenario> {
  const board = table.board;
  for (let game = 0; game < games; game++) {
    const runSeed = tableSeed(`${table.id}/game/${game}`, seed);
    yield {
      id: `${table.id}/game/${game}`,
      suite: 'game',
      seed: runSeed,
      initialState: initializeRulesState(createInitialGameState(board), board),
      controller: createTableController(table, runSeed),
      seconds: 60,
    };
  }
  const velocities = [
    { x: 0, y: 0 },
    { x: 0, y: 80 },
    { x: -40, y: 250 },
    { x: 40, y: 250 },
  ];
  for (const [index, flipper] of board.flippers.entries())
    for (let band = 0; band < (deep ? 4 : 1); band++)
      for (const x of [0, 0.75, 1.25, 1.75])
        for (const y of [2.5, 3.5, 4.5])
          for (const [velocityIndex, velocity] of velocities.entries())
            for (const mode of ['rest', 'held', 'release', 'raise'] as const) {
              const id = `${table.id}/lip/${index}/${band}/${x}/${y}/${velocityIndex}/${mode}`;
              const runSeed = tableSeed(id, seed),
                random = createSeededRandom(runSeed);
              const state = initializeRulesState(
                createInitialGameState(board),
                board,
              );
              state.status = 'playing';
              state.launcherExited = state.ball.launcherExited = true;
              const outward = flipper.side === 'left' ? -1 : 1,
                radius = state.ball.radius;
              state.ball.position = {
                x:
                  flipper.x +
                  outward * radius * (x + (band ? (random() - 0.5) * 0.5 : 0)),
                y:
                  flipper.y -
                  radius * (y + (band ? (random() - 0.5) * 0.5 : 0)),
              };
              state.ball.linearVelocity = {
                x: velocity.x + (band ? (random() - 0.5) * 120 : 0),
                y: velocity.y + (band ? (random() - 0.5) * 120 : 0),
              };
              if (band) state.ball.angularVelocity.y = (random() - 0.5) * 40;
              if (mode === 'held' || mode === 'release')
                state.flippers.forEach((f, i) => {
                  if (board.flippers[i].side === flipper.side) {
                    f.engaged = true;
                    f.angle = board.flippers[i].activeAngle;
                  }
                });
              const delay = band ? Math.round(random() * 18) : 9;
              yield {
                id,
                suite: 'lip',
                seed: runSeed,
                initialState: state,
                seconds: 6,
                skip:
                  getPhysicsSandboxSpawnBlockedReason(
                    board,
                    state.ball.position,
                    state,
                  ) ?? undefined,
                controller: (_, frame) => ({
                  ...idle,
                  [flipper.side === 'left' ? 'leftPressed' : 'rightPressed']:
                    mode === 'held' ||
                    (mode === 'release' && frame < 60) ||
                    (mode === 'raise' && frame >= delay && frame < 60),
                }),
              };
            }
}
