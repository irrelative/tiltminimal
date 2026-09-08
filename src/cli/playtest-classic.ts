import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  runClassicPlaytest,
  formatClassicReport,
  type ClassicReport,
} from '../playtest/classic-playtest';
import { replay } from '../playtest/simulation';

const args = process.argv.slice(2);
try {
  const options: Record<string, string> = {};
  for (let i = 0; i < args.length; i += 2) {
    if (
      ![
        '--games',
        '--seed',
        '--seconds',
        '--output',
        '--replay',
        '--run',
      ].includes(args[i]) ||
      !args[i + 1] ||
      args[i + 1].startsWith('--')
    )
      throw new Error(
        'Usage: make playtest-classic ARGS="[--games 24] [--seed 1979] [--seconds 60] [--output playtest-results/classic.json]" or "--replay <json> --run <id>"',
      );
    options[args[i]] = args[i + 1];
  }
  if (options['--replay']) {
    const report = JSON.parse(
      readFileSync(options['--replay'], 'utf8'),
    ) as ClassicReport;
    if (report.version !== 1 || report.stepSeconds !== 1 / 120)
      throw new Error('Unsupported replay format');
    const run = report.runs.find((r) => r.id === options['--run']);
    if (!run) throw new Error('Choose a recorded run with --run <id>');
    const final = replay(report.board, run);
    if (JSON.stringify(final) !== JSON.stringify(run.finalState))
      throw new Error(`Replay diverged: ${run.id}`);
    console.log(`Replay matched: ${run.id} (${run.frames} frames)`);
  } else {
    const games = Number(options['--games'] ?? 24),
      seed = Number(options['--seed'] ?? 1979),
      seconds = Number(options['--seconds'] ?? 60);
    if (
      !Number.isInteger(games) ||
      games < 1 ||
      games > 200 ||
      !Number.isInteger(seed) ||
      seed < 0 ||
      seed > 0xffffffff ||
      !Number.isInteger(seconds) ||
      seconds < 1 ||
      seconds > 300
    )
      throw new Error(
        'Games must be 1–200, seed an unsigned 32-bit integer, and seconds 1–300.',
      );
    const report = runClassicPlaytest(games, seed, seconds),
      output = options['--output'] ?? 'playtest-results/classic.json';
    if (!output.endsWith('.json'))
      throw new Error('Output must end with .json');
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, JSON.stringify(report));
    writeFileSync(output.slice(0, -5) + '.md', formatClassicReport(report));
    console.log(
      `Saved ${report.runs.length} runs to ${output} and ${output.slice(0, -5)}.md`,
    );
    console.log(
      `Diagnostic flags: ${report.runs.reduce((n, r) => n + r.flags.length, 0)}`,
    );
    if (
      report.runs.some(
        (r) =>
          r.outcome === 'non-finite' ||
          r.flags.includes('Ball escaped table bounds'),
      )
    )
      process.exitCode = 1;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
