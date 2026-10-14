import type { BoardDefinition } from '../types/board-definition';
import type { GameState } from '../game/game-state';
import type { InputState } from '../input/keyboard-input';
import { advanceGameFrame } from '../game/advance-game';
import type { PhysicsDebug } from '../game/physics-debug';

export interface Finding {
  code:
    | 'stationary-stall'
    | 'held-release-failure'
    | 'bounded-livelock'
    | 'non-finite'
    | 'escaped-bounds'
    | 'tactic-failed';
  frame: number;
  seconds: number;
  ballId: number;
  point: { x: number; y: number };
  flipper?: number;
  guide?: number;
  confirmed: boolean;
  recovery: string[];
}
export interface PlaytestArtifact {
  kind: 'headless-playtest';
  version: 1;
  id: string;
  tableId: string;
  revision: string;
  seed: number;
  board: BoardDefinition;
  initialState: GameState;
  frameDurations: number[];
  inputs: { frame: number; input: InputState }[];
  findings: Finding[];
  finalHash: string;
  tactic?: {
    name: string;
    source: number;
    control?: string;
    passed: boolean;
    errors: string[];
    metrics: Record<string, number | boolean>;
  };
  diagnosticContacts?: PhysicsDebug['contacts'];
  cadenceChecks?: { cadence: string; confirmed: boolean; codes: string[] }[];
  neighbors?: { dx: number; dy: number; valid: boolean; confirmed: boolean }[];
}
export const copyState = (state: GameState): GameState =>
  structuredClone(state);
export const stateHash = (state: GameState): string => {
  const text = JSON.stringify(state);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++)
    hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(16);
};
export const inputKey = (input: InputState): string =>
  `${+input.leftPressed}${+input.rightPressed}${+input.launchPressed}${+input.nudgeLeftPressed}${+input.nudgeRightPressed}${+input.nudgeUpPressed}`;

export const replayArtifact = (
  artifact: PlaytestArtifact,
  board = artifact.board,
  frames = artifact.frameDurations.length,
  debug?: PhysicsDebug,
): GameState => {
  let state = copyState(artifact.initialState);
  let index = 0;
  let input = artifact.inputs[0].input;
  for (
    let frame = 0;
    frame < Math.min(frames, artifact.frameDurations.length);
    frame++
  ) {
    while (artifact.inputs[index]?.frame === frame)
      input = artifact.inputs[index++].input;
    const seconds = artifact.frameDurations[frame];
    const step = () => advanceGameFrame(state, board, input, seconds).state;
    state = debug ? debug.capture(seconds, step) : step();
  }
  return state;
};

/** Validate imported data before advancing it; no executable content is accepted. */
export const parseArtifact = (text: string): PlaytestArtifact => {
  const a = JSON.parse(text) as PlaytestArtifact;
  if (
    a.kind !== 'headless-playtest' ||
    a.version !== 1 ||
    !a.board?.flippers ||
    !a.initialState?.ball ||
    !Array.isArray(a.frameDurations) ||
    !Array.isArray(a.inputs) ||
    !a.inputs.length ||
    a.inputs[0].frame !== 0 ||
    !Array.isArray(a.findings)
  )
    throw new Error('Unsupported or incomplete playtest artifact');
  if (a.frameDurations.some((dt) => !Number.isFinite(dt) || dt <= 0 || dt > 10))
    throw new Error('Invalid simulation frame duration');
  if (
    a.frameDurations.length > 20000 ||
    a.frameDurations.reduce((sum, dt) => sum + dt, 0) > 300
  )
    throw new Error('Replay exceeds the five-minute diagnostic limit');
  const finiteTree = (value: unknown): boolean =>
    typeof value === 'number'
      ? Number.isFinite(value)
      : value !== null && typeof value === 'object'
        ? Object.values(value).every(finiteTree)
        : true;
  if (
    !finiteTree(a.board) ||
    !finiteTree(a.initialState) ||
    ![
      a.board.width,
      a.board.height,
      a.board.ball?.radius,
      a.board.ball?.mass,
      a.board.physics?.solver?.epsilon,
      a.initialState.ball.radius,
      a.initialState.ball.mass,
      a.initialState.ball.momentOfInertia,
    ].every((n) => typeof n === 'number' && n > 0) ||
    ![
      a.initialState.ball.position.x,
      a.initialState.ball.position.y,
      a.initialState.ball.linearVelocity.x,
      a.initialState.ball.linearVelocity.y,
    ].every((n) => typeof n === 'number' && Number.isFinite(n)) ||
    ![
      'guides',
      'posts',
      'bumpers',
      'standupTargets',
      'dropTargets',
      'saucers',
      'spinners',
      'slingshots',
      'rollovers',
    ].every((k) => Array.isArray(a.board[k as keyof BoardDefinition])) ||
    !a.board.plunger ||
    !a.board.surfaceMaterials
  )
    throw new Error('Invalid board or initial dynamics');
  let previous = -1;
  for (const change of a.inputs) {
    if (
      !Number.isInteger(change.frame) ||
      change.frame <= previous ||
      change.frame >= Math.max(1, a.frameDurations.length) ||
      !change.input ||
      [
        'leftPressed',
        'rightPressed',
        'launchPressed',
        'nudgeLeftPressed',
        'nudgeRightPressed',
        'nudgeUpPressed',
      ].some((k) => typeof change.input[k as keyof InputState] !== 'boolean')
    )
      throw new Error('Invalid input transitions');
    previous = change.frame;
  }
  return a;
};
