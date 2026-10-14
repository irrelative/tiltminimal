import { CanvasRenderer } from '../render/canvas-renderer';
import { PhysicsDebug } from '../game/physics-debug';
import { advanceGameFrame } from '../game/advance-game';
import { BUILT_IN_TABLES } from '../boards/table-library';
import { activeBalls } from './detectors';
import {
  parseArtifact,
  copyState,
  stateHash,
  type PlaytestArtifact,
} from './artifact';
import { idle } from './simulation';
import type { GameState } from '../game/game-state';

const style = document.createElement('style');
style.textContent =
  'body{margin:0;background:#081119;color:#eef5fb;font:16px system-ui}main{padding:20px;max-width:1400px;margin:auto}button,select,input{font:inherit;margin:5px;padding:8px}#frame{display:block;width:95%}.views{display:grid;grid-template-columns:minmax(240px,1fr) minmax(240px,1fr);gap:20px}#board{width:100%;max-height:85vh;object-fit:contain}#zoom,#speed{width:100%;background:#162536}pre{font-size:12px;white-space:pre-wrap;max-height:40vh;overflow:auto}@media(max-width:700px){.views{grid-template-columns:1fr}}';
document.head.append(style);
const element = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const canvas = element<HTMLCanvasElement>('board'),
  zoom = element<HTMLCanvasElement>('zoom'),
  graph = element<HTMLCanvasElement>('speed');
const renderer = new CanvasRenderer(canvas),
  debug = new PhysicsDebug();
debug.enabled = true;
const slider = element<HTMLInputElement>('frame'),
  status = element('status');
const caseSelect = element<HTMLSelectElement>('case'),
  findingSelect = element<HTMLSelectElement>('finding');
const artifacts: PlaytestArtifact[] = [];
let artifact: PlaytestArtifact | undefined,
  currentFrame = 0,
  playing = false,
  playbackGeneration = 0,
  replayHash = '';
let checkpoints: { frame: number; state: GameState }[] = [];
let metrics: {
  time: number;
  balls: { id: number; x: number; y: number; speed: number }[];
}[] = [];
const board = () =>
  element<HTMLInputElement>('current').checked
    ? (BUILT_IN_TABLES.find((t) => t.id === artifact?.tableId)?.board ??
      artifact!.board)
    : artifact!.board;
const inputAt = (frame: number) => {
  let input = { ...idle };
  for (const change of artifact!.inputs) {
    if (change.frame > frame) break;
    input = change.input;
  }
  return input;
};
const selectedFinding = () => artifact?.findings[Number(findingSelect.value)];
const seek = (frame: number) => {
  if (!artifact) return;
  currentFrame = Math.max(0, Math.min(frame, metrics.length - 1));
  slider.value = String(currentFrame);
  const start =
    [...checkpoints]
      .reverse()
      .find((c) => c.frame <= Math.max(0, currentFrame - 30)) ?? checkpoints[0];
  let state = copyState(start.state);
  debug.clear();
  debug.time = metrics[start.frame]?.time ?? 0;
  for (let i = start.frame; i < currentFrame; i++)
    state = debug.capture(
      artifact.frameDurations[i],
      () =>
        advanceGameFrame(
          state,
          board(),
          inputAt(i),
          artifact!.frameDurations[i],
        ).state,
    );
  renderer.renderGame(
    board(),
    state,
    inputAt(Math.max(0, currentFrame - 1)),
    debug,
  );
  const path = canvas.getContext('2d')!;
  path.strokeStyle = '#ffc66dcc';
  path.lineWidth = 2;
  path.beginPath();
  const trackedId = selectedFinding()?.ballId ?? state.ball.id ?? 0;
  let startedPath = false;
  for (const metric of metrics.slice(
    Math.max(0, currentFrame - 180),
    currentFrame + 1,
  )) {
    const tracked = metric.balls.find((b) => b.id === trackedId);
    if (!tracked || !Number.isFinite(tracked.x + tracked.y)) continue;
    const x = (tracked.x * canvas.width) / board().width;
    const y = (tracked.y * canvas.height) / board().height;
    if (!startedPath) {
      path.moveTo(x, y);
      startedPath = true;
    } else path.lineTo(x, y);
  }
  path.stroke();
  const finding = selectedFinding(),
    ball =
      activeBalls(state).find((b, i) => (b.id ?? i) === finding?.ballId) ??
      state.ball;
  const point = finding?.point ?? ball.position,
    context = zoom.getContext('2d')!;
  const scaleX = canvas.width / board().width,
    scaleY = canvas.height / board().height;
  context.clearRect(0, 0, zoom.width, zoom.height);
  context.drawImage(
    canvas,
    (point.x - 120) * scaleX,
    (point.y - 100) * scaleY,
    240 * scaleX,
    180 * scaleY,
    0,
    0,
    400,
    300,
  );
  status.textContent = `${artifact.id} · frame ${currentFrame}/${artifact.frameDurations.length} · ${(metrics[currentFrame]?.time ?? 0).toFixed(3)}s · ball speed ${Math.hypot(ball.linearVelocity.x, ball.linearVelocity.y).toFixed(2)} · recorded ${artifact.revision} · final hash ${replayHash === artifact.finalHash ? 'matches' : 'differs'}. Replay uses the current engine${element<HTMLInputElement>('current').checked ? ' and current table' : ' with the recorded board'}.`;
  element('contacts').textContent = debug.contacts
    .slice(-16)
    .map(
      (c) =>
        `${c.collider?.kind ?? 'surface'} ${c.collider?.index ?? ''} ${c.collider?.feature ?? ''} · overlap ${c.overlap?.toFixed(3)} · impulse ${c.impulse?.normalImpulse.toFixed(2)} / ${c.impulse?.tangentImpulse.toFixed(2)} · normal (${c.normal.x.toFixed(2)}, ${c.normal.y.toFixed(2)})`,
    )
    .join('\n');
  const g = graph.getContext('2d')!;
  g.clearRect(0, 0, graph.width, graph.height);
  const speeds = metrics.map(
      (m) =>
        (m.balls.find((b) => b.id === finding?.ballId) ?? m.balls[0])?.speed ??
        0,
    ),
    max = Math.max(1, ...speeds);
  g.strokeStyle = '#8ce0ff';
  g.beginPath();
  metrics.forEach((m, i) => {
    const x =
        (m.time / Math.max(1e-8, metrics[metrics.length - 1].time)) *
        graph.width,
      y = 90 - (speeds[i] / max) * 80;
    if (!i) g.moveTo(x, y);
    else g.lineTo(x, y);
  });
  g.stroke();
  g.strokeStyle = '#ffad6b';
  g.beginPath();
  const x =
    ((metrics[currentFrame]?.time ?? 0) /
      Math.max(1e-8, metrics[metrics.length - 1].time)) *
    graph.width;
  g.moveTo(x, 0);
  g.lineTo(x, 100);
  g.stroke();
};
const load = () => {
  artifact = artifacts[Number(caseSelect.value)];
  if (!artifact) return;
  playing = false;
  playbackGeneration++;
  const current = element<HTMLInputElement>('current');
  current.disabled = !BUILT_IN_TABLES.some((t) => t.id === artifact!.tableId);
  if (current.disabled) current.checked = false;
  element('play').textContent = 'Play';
  let state = copyState(artifact.initialState),
    time = 0;
  checkpoints = [{ frame: 0, state: copyState(state) }];
  metrics = [];
  const sample = () =>
    metrics.push({
      time,
      balls: activeBalls(state).map((b, i) => ({
        id: b.id ?? i,
        x: b.position.x,
        y: b.position.y,
        speed: Math.hypot(b.linearVelocity.x, b.linearVelocity.y),
      })),
    });
  sample();
  for (let i = 0; i < artifact.frameDurations.length; i++) {
    state = advanceGameFrame(
      state,
      board(),
      inputAt(i),
      artifact.frameDurations[i],
    ).state;
    if (
      activeBalls(state).some(
        (b) =>
          !Number.isFinite(
            b.position.x +
              b.position.y +
              b.linearVelocity.x +
              b.linearVelocity.y,
          ),
      )
    )
      break;
    time += artifact.frameDurations[i];
    sample();
    if ((i + 1) % 120 === 0)
      checkpoints.push({ frame: i + 1, state: copyState(state) });
  }
  replayHash = stateHash(state);
  findingSelect.replaceChildren();
  artifact.findings.forEach((f, i) =>
    findingSelect.add(
      new Option(
        `${f.code} · ball ${f.ballId} · ${f.confirmed ? 'confirmed' : 'candidate'}`,
        String(i),
      ),
    ),
  );
  if (!artifact.findings.length)
    findingSelect.add(new Option('Whole recording', '0'));
  slider.max = String(metrics.length - 1);
  seek(Math.max(0, (artifact.findings[0]?.frame ?? 0) - 60));
};
element<HTMLInputElement>('files').addEventListener('change', async (event) => {
  try {
    const files = [...((event.target as HTMLInputElement).files ?? [])];
    const loaded: PlaytestArtifact[] = [];
    for (const file of files) {
      if (file.size > 20_000_000) throw new Error('Replay exceeds 20 MB');
      loaded.push(parseArtifact(await file.text()));
    }
    artifacts.splice(0, artifacts.length, ...loaded);
    caseSelect.replaceChildren();
    artifacts.forEach((a, i) => caseSelect.add(new Option(a.id, String(i))));
    load();
  } catch (error) {
    status.textContent = `Cannot load replay: ${error instanceof Error ? error.message : error}`;
    playing = false;
  }
});
caseSelect.addEventListener('change', load);
element('current').addEventListener('change', load);
findingSelect.addEventListener('change', () =>
  seek(Math.max(0, (selectedFinding()?.frame ?? 0) - 60)),
);
slider.addEventListener('input', () => {
  playing = false;
  seek(Number(slider.value));
  element('play').textContent = 'Play';
});
element('back').addEventListener('click', () => {
  playing = false;
  seek(currentFrame - 1);
  element('play').textContent = 'Play';
});
element('next').addEventListener('click', () => {
  playing = false;
  seek(currentFrame + 1);
  element('play').textContent = 'Play';
});
element('play').addEventListener('click', () => {
  if (!artifact) return;
  playing = !playing;
  element('play').textContent = playing ? 'Pause' : 'Play';
  const generation = ++playbackGeneration;
  const started = performance.now(),
    initialTime = metrics[currentFrame].time;
  const draw = () => {
    if (!playing || !artifact || generation !== playbackGeneration) return;
    const target =
      initialTime +
      ((performance.now() - started) / 1000) *
        Number(element<HTMLSelectElement>('rate').value);
    let frame = currentFrame;
    while (frame < metrics.length - 1 && metrics[frame + 1].time <= target)
      frame++;
    if (frame !== currentFrame) seek(frame);
    if (frame >= metrics.length - 1) {
      playing = false;
      element('play').textContent = 'Play';
    } else requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
});
