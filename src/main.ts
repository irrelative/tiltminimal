import { BUILT_IN_TABLES, type BuiltInTable } from './boards/table-library';
import { buildAppRoutePath, getAppRouteFromPathname } from './app/routes';
import {
  startStandalonePlaySession,
  syncPlayRoutePanel,
} from './app/play-session';
import {
  startPhysicsSandboxSession,
  syncPhysicsRoutePanel,
} from './app/physics-sandbox-session';
import { GameAudio } from './audio/game-audio';
import type { GameLoop } from './game/game-loop';
import type { PhysicsSandboxLoop } from './game/physics-sandbox-loop';
import { CanvasRenderer } from './render/canvas-renderer';
import type { BoardDefinition, Point } from './types/board-definition';
import './styles.css';

const required = <T extends Element>(selector: string): T => {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Expected ${selector}.`);
  return element;
};
const canvas = required<HTMLCanvasElement>('#game');
const tableSelect = required<HTMLSelectElement>('#play-table-select');
const modeTitle = required<HTMLElement>('#mode-title');
const modeCopy = required<HTMLElement>('#mode-copy');
const playMeta = required<HTMLElement>('#play-table-meta');
const renderer = new CanvasRenderer(canvas);
const audio = new GameAudio();
const basePath = import.meta.env.BASE_URL;
const route = getAppRouteFromPathname(window.location.pathname, basePath);
document.body.dataset.sessionRoute = route;
const state: {
  tableId: string;
  loop: GameLoop | null;
  sandbox: PhysicsSandboxLoop | null;
} = { tableId: BUILT_IN_TABLES[0]?.id ?? '', loop: null, sandbox: null };
const table = (): BuiltInTable =>
  BUILT_IN_TABLES.find((item) => item.id === state.tableId) ??
  BUILT_IN_TABLES[0]!;
const features = (board: BoardDefinition): number =>
  board.posts.length +
  board.bumpers.length +
  board.standupTargets.length +
  board.dropTargets.length +
  board.saucers.length +
  board.spinners.length +
  board.slingshots.length +
  board.rollovers.length +
  board.guides.length +
  board.flippers.length;
const restart = (): void => {
  playMeta.textContent = `${features(table().board)} features${table().description ? ' · ' + table().description : ''}`;
  state.loop?.stop();
  state.sandbox?.stop();
  if (route === 'physics') {
    const session = startPhysicsSandboxSession({
      activeTable: table(),
      canvas,
      renderer,
      modeTitle,
      statusMessage: required('#physics-status'),
      pauseButton: required('#physics-pause-toggle'),
      debugStatus: required('#physics-debug-status'),
      debugPosition: required('#physics-debug-position'),
      debugVelocity: required('#physics-debug-velocity'),
      debugSpin: required('#physics-debug-spin'),
    });
    state.sandbox = session.loop;
    state.loop = null;
  } else {
    const session = startStandalonePlaySession({
      activeTable: table(),
      canvas,
      renderer,
      gameAudio: audio,
      modeTitle,
      playDebugStatus: required('#play-debug-status'),
      playDebugPosition: required('#play-debug-position'),
      playDebugVelocity: required('#play-debug-velocity'),
      playDebugSpin: required('#play-debug-spin'),
    });
    state.loop = session.loop;
    state.sandbox = null;
  }
  const debug = (state.loop ?? state.sandbox)!.debug;
  debug.enabled = required<HTMLInputElement>('#debug-overlay').checked;
  debug.speed = Number(required<HTMLSelectElement>('#debug-speed').value);
};
if (route === 'physics') {
  syncPhysicsRoutePanel({
    tables: BUILT_IN_TABLES,
    activeTableId: state.tableId,
    tableSelect,
    tableMeta: playMeta,
    getFeatureCount: features,
  });
  modeCopy.textContent =
    'Inject balls to inspect the code-authored table physics.';
  required<HTMLSelectElement>('#physics-spawn-mode').addEventListener(
    'change',
    (event) =>
      state.sandbox?.setSpawnMode(
        (event.target as HTMLSelectElement).value === 'add' ? 'add' : 'replace',
      ),
  );
  (['x', 'y'] as const).forEach((axis) =>
    required<HTMLInputElement>(`#physics-v${axis}`).addEventListener(
      'input',
      (event) =>
        state.sandbox?.setLinearVelocity(
          axis,
          Number((event.target as HTMLInputElement).value),
        ),
    ),
  );
  (['x', 'y'] as const).forEach((axis) =>
    required<HTMLInputElement>(`#physics-w${axis}`).addEventListener(
      'input',
      (event) =>
        state.sandbox?.setAngularVelocity(
          axis,
          Number((event.target as HTMLInputElement).value),
        ),
    ),
  );
  required<HTMLButtonElement>('#physics-pause-toggle').addEventListener(
    'click',
    () => state.sandbox?.togglePaused(),
  );
  required<HTMLButtonElement>('#physics-clear-balls').addEventListener(
    'click',
    () => state.sandbox?.clearBalls(),
  );
  required<HTMLButtonElement>('#physics-reset').addEventListener('click', () =>
    state.sandbox?.reset(),
  );
  canvas.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'touch') {
      const rect = canvas.getBoundingClientRect();
      state.sandbox?.spawnBall({
        x: ((event.clientX - rect.left) * table().board.width) / rect.width,
        y: ((event.clientY - rect.top) * table().board.height) / rect.height,
      } satisfies Point);
    }
  });
} else {
  syncPlayRoutePanel({
    tables: BUILT_IN_TABLES,
    activeTableId: state.tableId,
    playTableSelect: tableSelect,
    playTableMeta: playMeta,
    getFeatureCount: features,
  });
  required<HTMLButtonElement>('#play-reset-ball').addEventListener(
    'click',
    () => state.loop?.resetBall(),
  );
}
tableSelect.addEventListener('change', () => {
  state.tableId = tableSelect.value;
  restart();
});
required<HTMLAnchorElement>('#play-link').href = buildAppRoutePath(
  'play',
  basePath,
);
required<HTMLAnchorElement>('#physics-link').href = buildAppRoutePath(
  'physics',
  basePath,
);
restart();

const currentDebug = () => (state.loop ?? state.sandbox)!.debug;
required<HTMLInputElement>('#debug-overlay').addEventListener(
  'change',
  (event) => {
    const enabled = (event.target as HTMLInputElement).checked;
    currentDebug().enabled = enabled;
    required<HTMLElement>('#debug-controls').hidden = !enabled;
    if (!enabled) {
      currentDebug().paused = false;
      currentDebug().speed = 1;
      required<HTMLSelectElement>('#debug-speed').value = '1';
    }
  },
);
required('#debug-pause').addEventListener('click', () => {
  currentDebug().paused = !currentDebug().paused;
});
required('#debug-step').addEventListener('click', () => currentDebug().step());
required<HTMLSelectElement>('#debug-speed').addEventListener(
  'change',
  (event) => {
    currentDebug().speed = Number((event.target as HTMLSelectElement).value);
  },
);
let lastDebugEvents = '';
window.setInterval(() => {
  const debug = currentDebug();
  required('#debug-pause').textContent = debug.paused ? 'Resume' : 'Pause';
  required('#debug-pause').setAttribute('aria-pressed', String(debug.paused));
  required('#debug-time').textContent =
    `${debug.paused ? 'Paused' : 'Running'} · ${debug.time.toFixed(2)} s · ${debug.speed}×`;
  const events = debug.events.join('\n');
  if (events !== lastDebugEvents) {
    lastDebugEvents = events;
    required('#debug-events').replaceChildren(
      ...debug.events.map((text) => {
        const li = document.createElement('li');
        li.textContent = text;
        return li;
      }),
    );
  }
}, 100);
