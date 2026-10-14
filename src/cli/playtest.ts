import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { BUILT_IN_TABLES } from '../boards/table-library';
import { scenarios } from '../playtest/scenarios';
import {
  diagnoseFinding,
  findingCluster,
  investigateScenario,
  type RunSummary,
} from '../playtest/investigation';
import { parseArtifact, replayArtifact, stateHash } from '../playtest/artifact';
import { IssueDetector } from '../playtest/detectors';
import { advanceGameFrame } from '../game/advance-game';
import { getEngineRevision } from '../playtest/revision';
import { PhysicsDebug } from '../game/physics-debug';
import { refineArtifact } from '../playtest/refinement';

const usage =
  'make playtest ARGS="[--table all|<id>] [--preset smoke|deep] [--seed 1979] [--games 8] [--suite both|game|lip] [--output playtest-results/investigation] [--max-artifacts 32] [--strict]"; replay: --replay <case.json> [--current-table]';
try {
  const args = process.argv.slice(2),
    options: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (['--strict', '--current-table'].includes(key)) {
      options[key] = 'true';
      continue;
    }
    if (
      ![
        '--table',
        '--preset',
        '--seed',
        '--games',
        '--suite',
        '--output',
        '--max-artifacts',
        '--replay',
      ].includes(key) ||
      !args[i + 1] ||
      args[i + 1].startsWith('--')
    )
      throw new Error(usage);
    options[key] = args[++i];
  }
  const revision = getEngineRevision();
  if (options['--replay']) {
    const artifact = parseArtifact(readFileSync(options['--replay'], 'utf8'));
    const table = BUILT_IN_TABLES.find((t) => t.id === artifact.tableId);
    if (options['--current-table'] && !table)
      throw new Error('Current table is unavailable');
    const board = options['--current-table'] ? table!.board : artifact.board;
    if (artifact.revision !== revision)
      console.warn(
        `Recorded under ${artifact.revision}; replaying with ${revision}. Hash comparison is diagnostic across revisions.`,
      );
    const final = replayArtifact(artifact, board);
    console.log(
      `Replay hash: ${stateHash(final)}; recorded: ${artifact.finalHash}`,
    );
    if (
      !options['--current-table'] &&
      artifact.revision === revision &&
      stateHash(final) !== artifact.finalHash
    )
      throw new Error('Deterministic replay diverged');
    if (options['--current-table']) {
      const detector = new IssueDetector();
      let state = structuredClone(artifact.initialState),
        index = 0,
        input = artifact.inputs[0].input;
      const findings = [];
      for (let frame = 0; frame < artifact.frameDurations.length; frame++) {
        while (artifact.inputs[index]?.frame === frame)
          input = artifact.inputs[index++].input;
        const dt = artifact.frameDurations[frame],
          result = advanceGameFrame(state, board, input, dt);
        state = result.state;
        for (const candidate of detector.observe(
          state,
          board,
          input,
          dt,
          frame,
          result.events,
        )) {
          const finding = diagnoseFinding(
            candidate,
            state,
            { id: artifact.tableId, board },
            input,
          );
          if (finding) findings.push(finding);
        }
      }
      console.log(`Current-table candidates: ${findings.length}`);
      process.exitCode = findings.some((f) => f.confirmed) ? 1 : 0;
    }
  } else {
    const preset = options['--preset'] ?? 'smoke',
      suite = options['--suite'] ?? 'both';
    if (
      !['smoke', 'deep'].includes(preset) ||
      !['both', 'game', 'lip'].includes(suite)
    )
      throw new Error(usage);
    const seed = Number(options['--seed'] ?? 1979),
      games = Number(options['--games'] ?? (preset === 'deep' ? 64 : 8)),
      maxArtifacts = Number(options['--max-artifacts'] ?? 32);
    if (
      !Number.isInteger(seed) ||
      seed < 0 ||
      seed > 0xffffffff ||
      !Number.isInteger(games) ||
      games < 0 ||
      games > 1000 ||
      !Number.isInteger(maxArtifacts) ||
      maxArtifacts < 1 ||
      maxArtifacts > 1000
    )
      throw new Error('Invalid seed, games or artifact limit');
    const tables =
      options['--table'] && options['--table'] !== 'all'
        ? BUILT_IN_TABLES.filter((t) => t.id === options['--table'])
        : BUILT_IN_TABLES;
    if (!tables.length) throw new Error('Unknown table');
    const output = options['--output'] ?? 'playtest-results/investigation';
    mkdirSync(join(output, 'cases'), { recursive: true });
    const started = performance.now(),
      summaries: RunSummary[] = [],
      artifacts: { path: string; cluster: string }[] = [],
      clusters = new Set<string>();
    let frames = 0,
      seconds = 0,
      failures = 0;
    for (const table of tables) {
      const tableStart = performance.now();
      let count = 0;
      for (const scenario of scenarios(table, seed, preset === 'deep', games)) {
        if (suite !== 'both' && scenario.suite !== suite) continue;
        const { summary, artifact } = investigateScenario(
          table,
          scenario,
          revision,
        );
        summaries.push(summary);
        count++;
        frames += summary.frames;
        seconds += summary.seconds;
        if (summary.findings.some((f) => f.confirmed)) failures++;
        for (const finding of summary.findings) {
          const cluster = findingCluster(table.id, finding);
          if (clusters.has(cluster)) continue;
          clusters.add(cluster);
          if (artifacts.length >= maxArtifacts) continue;
          const file = `cases/${String(artifacts.length).padStart(3, '0')}-${table.id}.json`;
          const debug = new PhysicsDebug();
          debug.enabled = true;
          if (
            stateHash(
              replayArtifact(
                artifact,
                artifact.board,
                artifact.frameDurations.length,
                debug,
              ),
            ) !== artifact.finalHash
          )
            throw new Error('Diagnostic tracing changed replay');
          artifact.diagnosticContacts = debug.contacts;
          refineArtifact(table, artifact);
          writeFileSync(join(output, file), JSON.stringify(artifact));
          artifacts.push({ path: file, cluster });
        }
      }
      console.log(
        `${table.id}: ${count} cases in ${((performance.now() - tableStart) / 1000).toFixed(2)}s`,
      );
    }
    const wallSeconds = (performance.now() - started) / 1000;
    const report = {
      kind: 'headless-playtest-report',
      version: 1,
      revision,
      seed,
      preset,
      suite,
      complete: true,
      frames,
      simulatedSeconds: seconds,
      wallSeconds,
      speedup: seconds / wallSeconds,
      failures,
      uniqueClusters: clusters.size,
      artifacts,
      summaries,
      coverage: tables.map((t) => ({
        table: t.id,
        flippers: t.board.flippers.length,
        hits: [
          ...new Set(
            summaries
              .filter((s) => s.id.startsWith(t.id + '/'))
              .flatMap((s) => s.hits),
          ),
        ],
        unvisited: [
          'bumpers',
          'standupTargets',
          'dropTargets',
          'saucers',
          'spinners',
          'rollovers',
        ].flatMap((kind) => {
          const names: Record<string, string> = {
            bumpers: 'bumper-hit',
            standupTargets: 'standup-target-hit',
            dropTargets: 'drop-target-hit',
            saucers: 'saucer-captured',
            spinners: 'spinner-spin',
            rollovers: 'rollover-hit',
          };
          const hits = new Set(
            summaries
              .filter((s) => s.id.startsWith(t.id + '/'))
              .flatMap((s) => s.hits),
          );
          return (t.board[kind as keyof typeof t.board] as unknown[]).flatMap(
            (_, index) =>
              hits.has(`${names[kind]}:${index}`) ? [] : [`${kind}:${index}`],
          );
        }),
      })),
    };
    writeFileSync(join(output, 'report.json'), JSON.stringify(report));
    const text = `# Headless investigation\n\n${summaries.length} cases; ${failures} confirmed failures; ${clusters.size} issue clusters.\n\n${seconds.toFixed(1)} simulated seconds in ${wallSeconds.toFixed(2)} wall seconds (${report.speedup.toFixed(1)}× real time).\n\nSkipped invalid seeds: ${summaries.filter((s) => s.skip).length}. Time-limited episodes: ${summaries.filter((s) => s.outcome === 'time-limit').length}.\n\n## Reproductions\n\n${artifacts.map((a) => `- [${a.cluster}](${a.path})`).join('\n')}\n\nNo findings means sampled coverage, not proof of playability.\n`;
    writeFileSync(join(output, 'report.md'), text);
    console.log(text);
    process.exitCode =
      failures || (options['--strict'] && clusters.size) ? 1 : 0;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 2;
}
