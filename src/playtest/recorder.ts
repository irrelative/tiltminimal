import type { BoardDefinition } from '../types/board-definition';
import type { GameState } from '../game/game-state';
import type { InputState } from '../input/keyboard-input';
import type { GameEvent } from '../game/rules-types';
import {
  copyState,
  inputKey,
  stateHash,
  type PlaytestArtifact,
} from './artifact';
import { IssueDetector } from './detectors';
import { idle } from './simulation';

interface Chunk {
  initial: GameState;
  durations: number[];
  inputs: PlaytestArtifact['inputs'];
  seconds: number;
  key: string;
}
export class ReplayRecorder {
  private chunks: Chunk[] = [];
  private seconds = 0;
  private frames = 0;
  private final: GameState;
  private detector = new IssueDetector();
  private frozen?: PlaytestArtifact;
  private pending?: {
    artifact: PlaytestArtifact;
    seconds: number;
    key: string;
  };
  constructor(
    private readonly board: BoardDefinition,
    initial: GameState,
  ) {
    this.final = copyState(initial);
  }
  get hasFrames(): boolean {
    return this.chunks.some((c) => c.durations.length > 0);
  }
  get hasIssue(): boolean {
    return !!(this.frozen || this.pending);
  }
  reset(state: GameState, preserveIssue = false): void {
    if (preserveIssue && this.pending) this.frozen = this.pending.artifact;
    if (!preserveIssue) this.frozen = undefined;
    this.pending = undefined;
    this.chunks = [];
    this.seconds = this.frames = 0;
    this.final = copyState(state);
    this.detector = new IssueDetector();
  }
  record(
    before: GameState,
    after: GameState,
    input: InputState,
    dt: number,
    events: GameEvent[],
  ): void {
    if (dt <= 0) return;
    let chunk = this.chunks[this.chunks.length - 1];
    if (!chunk || chunk.seconds >= 2) {
      chunk = {
        initial: copyState(before),
        durations: [],
        inputs: [],
        seconds: 0,
        key: '',
      };
      this.chunks.push(chunk);
    }
    const key = inputKey(input);
    if (key !== chunk.key) {
      chunk.inputs.push({ frame: chunk.durations.length, input: { ...input } });
      chunk.key = key;
    }
    chunk.durations.push(dt);
    chunk.seconds += dt;
    this.seconds += dt;
    this.frames++;
    this.final = after;
    while (
      this.chunks.length > 1 &&
      this.seconds - this.chunks[0].seconds >= 30
    )
      this.seconds -= this.chunks.shift()!.seconds;
    if (this.pending) {
      const pending = this.pending,
        artifact = pending.artifact;
      if (key !== pending.key) {
        artifact.inputs.push({
          frame: artifact.frameDurations.length,
          input: { ...input },
        });
        pending.key = key;
      }
      artifact.frameDurations.push(dt);
      artifact.finalHash = stateHash(after);
      pending.seconds += dt;
      if (pending.seconds >= 2) {
        this.frozen = artifact;
        this.pending = undefined;
      }
    }
    const findings = this.detector.observe(
      after,
      this.board,
      input,
      dt,
      this.frames - 1,
      events,
    );
    if (this.pending && findings.length) {
      this.pending.artifact.findings.push(
        ...findings.map((f) => ({
          ...f,
          frame: this.pending!.artifact.frameDurations.length - 1,
          seconds: this.seconds,
        })),
      );
    } else if (!this.pending && findings.length) {
      const artifact = this.snapshot('', 'pending');
      artifact.findings = findings.map((f) => ({
        ...f,
        frame: artifact.frameDurations.length - 1,
        seconds: this.seconds,
      }));
      this.pending = { artifact, seconds: 0, key };
    }
  }
  export(tableId: string, revision: string, issue = false): PlaytestArtifact {
    const artifact =
      issue && (this.frozen || this.pending)
        ? structuredClone(this.pending?.artifact ?? this.frozen!)
        : this.snapshot(tableId, revision);
    artifact.tableId = tableId;
    artifact.revision = revision;
    return artifact;
  }
  private snapshot(tableId: string, revision: string): PlaytestArtifact {
    const durations: number[] = [],
      inputs: PlaytestArtifact['inputs'] = [];
    for (const chunk of this.chunks) {
      for (const change of chunk.inputs)
        inputs.push({
          frame: durations.length + change.frame,
          input: { ...change.input },
        });
      durations.push(...chunk.durations);
    }
    return {
      kind: 'headless-playtest',
      version: 1,
      id: 'recorded-game',
      tableId,
      revision,
      seed: 0,
      board: structuredClone(this.board),
      initialState: copyState(this.chunks[0]?.initial ?? this.final),
      frameDurations: durations,
      inputs: inputs.length ? inputs : [{ frame: 0, input: { ...idle } }],
      findings: [],
      finalHash: stateHash(this.final),
    };
  }
}
