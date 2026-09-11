import { RuleCard } from './rule-card';
import { UserSettingsStore } from './user-settings';
import { HighScores, renderHighScores } from './high-scores';
import { BUILT_IN_TABLES, type BuiltInTable } from '../boards/table-library';
import { buildAppRoutePath, getAppRouteFromPathname } from './routes';
import { startStandalonePlaySession } from './play-session';
import { startPhysicsSandboxSession } from './physics-sandbox-session';
import { GameAudio } from '../audio/game-audio';
import type { GameLoop } from '../game/game-loop';
import type { PhysicsSandboxLoop } from '../game/physics-sandbox-loop';
import { CanvasRenderer } from '../render/canvas-renderer';
import type { Point } from '../types/board-definition';

const required = <T extends Element>(selector: string): T => {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Expected ${selector}.`);
  return element;
};
const canvas = required<HTMLCanvasElement>('#game');
const modeTitle = required<HTMLElement>('#mode-title');
const modeCopy = required<HTMLElement>('#mode-copy');
const highScores = new HighScores();
const showHighScores = (): void =>
  renderHighScores(
    required<HTMLOListElement>('#high-score-list'),
    required<HTMLElement>('#high-score-empty'),
    highScores.get(state.tableId),
  );
const renderer = new CanvasRenderer(canvas);
const audio = new GameAudio();
const settingsStore = new UserSettingsStore();
const settings = settingsStore.load();
const soundToggle = required<HTMLInputElement>('#setting-sound');
const volumeSlider = required<HTMLInputElement>('#setting-volume');
const spinToggle = required<HTMLInputElement>('#setting-spin-marker');
const trailToggle = required<HTMLInputElement>('#setting-ball-trail');
const performanceToggle = required<HTMLInputElement>('#setting-performance');
const performanceMeter = required<HTMLOutputElement>('#performance-meter');
let syncPerformance = (): void => {};
performanceToggle.checked = settings.showPerformance;
soundToggle.checked = settings.soundEnabled;
volumeSlider.value = String(settings.soundVolume * 100);
spinToggle.checked = settings.showSpinMarker;
trailToggle.checked = settings.showBallTrail;
const applySettings = (): void => {
  audio.setSettings(settings.soundEnabled, settings.soundVolume);
  renderer.setBallAppearance(settings);
  performanceMeter.hidden = !settings.showPerformance;
  syncPerformance();
  volumeSlider.disabled = !settings.soundEnabled;
  required<HTMLOutputElement>('#setting-volume-value').value =
    `${Math.round(settings.soundVolume * 100)}%`;
};
applySettings();
for (const control of [
  soundToggle,
  volumeSlider,
  spinToggle,
  trailToggle,
  performanceToggle,
]) {
  control.addEventListener('input', () => {
    settings.soundEnabled = soundToggle.checked;
    settings.soundVolume = Number(volumeSlider.value) / 100;
    settings.showSpinMarker = spinToggle.checked;
    settings.showBallTrail = trailToggle.checked;
    settings.showPerformance = performanceToggle.checked;
    applySettings();
    settingsStore.save(settings);
  });
}
const basePath = import.meta.env.BASE_URL;
const route = getAppRouteFromPathname(window.location.pathname, basePath);
document.body.dataset.sessionRoute = route;
required<HTMLAnchorElement>('#choose-table').href = buildAppRoutePath(
  route,
  basePath,
);
const state: {
  tableId: string;
  excludeAnalytics?: () => void;
  loop: GameLoop | null;
  sandbox: PhysicsSandboxLoop | null;
} = {
  tableId:
    BUILT_IN_TABLES.find(
      (table) =>
        table.id === new URLSearchParams(window.location.search).get('table'),
    )?.id ??
    BUILT_IN_TABLES[0]?.id ??
    '',
  loop: null,
  sandbox: null,
};
syncPerformance = (): void => {
  const meter = (state.loop ?? state.sandbox)?.performance;
  if (!meter) return;
  if (meter.enabled !== settings.showPerformance) meter.reset();
  meter.enabled = settings.showPerformance;
  if (meter.enabled) performanceMeter.textContent = 'Measuring frame rate…';
  meter.onReport = (s) => {
    performanceMeter.textContent = `${s.fps.toFixed(1)} FPS · ${s.frameMs.toFixed(1)} ms/frame
P95 ${s.p95Ms.toFixed(1)} ms · Max ${s.maxMs.toFixed(1)} ms · >50 ms: ${s.slowFrames}
Update ${s.updateMs.toFixed(1)} ms · Draw ${s.renderMs.toFixed(1)} ms`;
  };
};
document.addEventListener('visibilitychange', () => {
  (state.loop ?? state.sandbox)?.performance.reset();
});
const table = (): BuiltInTable =>
  BUILT_IN_TABLES.find((item) => item.id === state.tableId) ??
  BUILT_IN_TABLES[0]!;
const ruleCard = new RuleCard(required<HTMLElement>('#table-rules'), (open) => {
  const loop = state.loop ?? state.sandbox;
  if (loop) loop.suspended = open;
});
const restart = (): void => {
  ruleCard.setTable(table());
  showHighScores();
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
      onGameOver: (score) => {
        highScores.record(state.tableId, score);
        showHighScores();
      },
      modeTitle,
      playDebugStatus: required('#play-debug-status'),
      playDebugPosition: required('#play-debug-position'),
      playDebugVelocity: required('#play-debug-velocity'),
      playDebugSpin: required('#play-debug-spin'),
    });
    state.loop = session.loop;
    state.excludeAnalytics = session.excludeAnalytics;
    state.sandbox = null;
  }
  const debug = (state.loop ?? state.sandbox)!.debug;
  debug.enabled = required<HTMLInputElement>('#debug-overlay').checked;
  debug.speed = Number(required<HTMLSelectElement>('#debug-speed').value);
  syncPerformance();
};
if (route === 'physics') {
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
  required<HTMLButtonElement>('#play-reset-ball').addEventListener(
    'click',
    () => {
      state.excludeAnalytics?.();
      state.loop?.resetBall();
    },
  );
}
const syncTableUrl = (): void => {
  const url = new URL(window.location.href);
  url.searchParams.set('table', state.tableId);
  window.history.replaceState(window.history.state, '', url);
};
syncTableUrl();
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
