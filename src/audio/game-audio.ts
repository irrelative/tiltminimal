import { synthesizeBallImpact } from './ball-impact';
import type { GameEvent } from '../game/rules-types';
import {
  getTableAudioProfile,
  type TableAudioProfile,
} from './table-audio-profiles';
import { TableTonePlayer } from './table-tone-player';
import type { InputState } from '../input/keyboard-input';
import type {
  BoardDefinition,
  FlipperSide,
  SurfaceMaterialName,
} from '../types/board-definition';
import type { GameState } from '../game/game-state';
import { getDistanceToFlipperSurface } from '../game/flipper-geometry';
import { getGuideDistance, isArcGuide } from '../game/guide-geometry';
import { getPlungerGuideSegments } from '../game/plunger-geometry';

export type GameAudioEvent =
  | {
      type: 'ball-bounce';
      intensity: number;
      material: SurfaceMaterialName;
      pan: number;
    }
  | {
      type: 'flipper-trigger';
      side: FlipperSide;
      pan: number;
      intensity: number;
    };

export const getFrameAudioEvents = (
  previousState: GameState,
  nextState: GameState,
  previousInput: InputState,
  input: InputState,
  board: BoardDefinition,
  deltaSeconds: number,
): GameAudioEvent[] => {
  const events: GameAudioEvent[] = [];

  if (input.leftPressed && !previousInput.leftPressed) {
    events.push({
      type: 'flipper-trigger',
      side: 'left',
      pan: -0.65,
      intensity: 0.7,
    });
  }

  if (input.rightPressed && !previousInput.rightPressed) {
    events.push({
      type: 'flipper-trigger',
      side: 'right',
      pan: 0.65,
      intensity: 0.7,
    });
  }

  if (previousState.status !== 'playing' || nextState.status !== 'playing') {
    return events;
  }

  const clampedDeltaSeconds = Math.max(deltaSeconds, 1 / 240);
  const expectedVelocityX = previousState.ball.linearVelocity.x;
  const expectedVelocityY =
    previousState.ball.linearVelocity.y + board.gravity * clampedDeltaSeconds;
  const deltaVelocityX = nextState.ball.linearVelocity.x - expectedVelocityX;
  const deltaVelocityY = nextState.ball.linearVelocity.y - expectedVelocityY;
  const impactVelocity = Math.hypot(deltaVelocityX, deltaVelocityY);

  if (impactVelocity < 45) {
    return events;
  }

  const contactMaterial = getNearbyImpactMaterial(nextState, board);

  if (!contactMaterial) {
    return events;
  }

  events.push({
    type: 'ball-bounce',
    intensity: clamp((impactVelocity - 45) / 280, 0.12, 1),
    material: contactMaterial,
    pan: getStereoPan(nextState.ball.position.x, board.width),
  });

  return events;
};

export class GameAudio {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private enabled = true;
  private volume = 1;

  setSettings(enabled: boolean, volume: number): void {
    this.enabled = enabled;
    this.volume = Number.isFinite(volume) ? clamp(volume, 0, 1) : 1;
    if (this.masterGain) this.masterGain.gain.value = enabled ? this.volume : 0;
    if (!enabled) {
      this.pendingStart = false;
      this.tableTone.stop();
    }
  }

  private unlockBound = false;
  private readonly impactBuffers = new Map<string, AudioBuffer>();
  private impactVariant = 0;
  private lastBounceTime = -Infinity;

  private profile: TableAudioProfile | null = null;
  private readonly tableTone = new TableTonePlayer();
  private pendingStart = false;
  private session = 0;

  connect(board?: BoardDefinition): void {
    this.tableTone.stop();
    this.profile = board ? getTableAudioProfile(board) : null;
    this.pendingStart = this.enabled && this.profile !== null;
    this.session += 1;
    this.lastBounceTime = -Infinity;
    if (this.unlockBound || typeof window === 'undefined') {
      return;
    }

    window.addEventListener('pointerdown', this.unlockAudio, { passive: true });
    window.addEventListener('keydown', this.unlockAudio, { passive: true });
    this.unlockBound = true;
  }

  disconnect(): void {
    this.session += 1;
    this.pendingStart = false;
    this.tableTone.stop();
    this.profile = null;
    if (!this.unlockBound || typeof window === 'undefined') {
      return;
    }

    window.removeEventListener('pointerdown', this.unlockAudio);
    window.removeEventListener('keydown', this.unlockAudio);
    this.unlockBound = false;
  }

  startGame(): void {
    this.tableTone.stop();
    this.pendingStart = this.enabled && this.profile !== null;
    this.playPendingStart();
  }

  playGameEvents(events: readonly GameEvent[]): void {
    const context = this.getContext();
    if (!context || context.state !== 'running' || !this.profile) return;
    this.playPendingStart();
    const cue = this.profile.cueForEvents(events);
    if (cue) this.tableTone.play(context, cue, this.masterGain!);
  }

  private playPendingStart(): void {
    if (
      !this.enabled ||
      !this.pendingStart ||
      !this.profile ||
      this.context?.state !== 'running'
    )
      return;
    this.pendingStart = false;
    this.tableTone.play(this.context, this.profile.start, this.masterGain!);
  }

  playEvents(events: GameAudioEvent[]): void {
    if (events.length === 0) {
      return;
    }

    const context = this.getContext();

    if (!context || context.state === 'suspended') {
      return;
    }

    const now = context.currentTime;

    for (const event of events) {
      if (event.type === 'flipper-trigger') {
        this.playFlipperTrigger(context, now, event);
        continue;
      }

      if (now - this.lastBounceTime < 0.045) {
        continue;
      }

      this.lastBounceTime = now;
      this.playBallBounce(context, now, event);
    }
  }

  private readonly unlockAudio = (): void => {
    const context = this.getContext();

    if (!context) return;
    const session = this.session;
    if (context.state === 'suspended') {
      void context
        .resume()
        .then(() => {
          if (session === this.session) this.playPendingStart();
        })
        .catch(() => {
          /* A later user gesture can retry audio unlock. */
        });
    } else this.playPendingStart();
  };

  private getContext(): AudioContext | null {
    if (!this.enabled) return null;
    if (this.context) {
      return this.context;
    }

    if (typeof window === 'undefined') {
      return null;
    }

    const AudioContextCtor =
      window.AudioContext ??
      (
        window as Window &
          typeof globalThis & {
            webkitAudioContext?: typeof AudioContext;
          }
      ).webkitAudioContext;

    if (!AudioContextCtor) {
      return null;
    }

    this.context = new AudioContextCtor();
    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = this.volume;
    this.masterGain.connect(this.context.destination);
    return this.context;
  }

  private playFlipperTrigger(
    context: AudioContext,
    startTime: number,
    event: Extract<GameAudioEvent, { type: 'flipper-trigger' }>,
  ): void {
    const oscillator = context.createOscillator();
    // Harlem's solenoid is a low mechanical knock beneath the electronic voice.
    oscillator.type = this.profile ? 'triangle' : 'square';
    oscillator.frequency.setValueAtTime(this.profile ? 120 : 220, startTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      this.profile ? 55 : 110,
      startTime + 0.045,
    );

    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(
      0.045 * event.intensity,
      startTime + 0.004,
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.07);

    const panner = createStereoPanner(context, event.pan);
    oscillator.connect(gain);
    gain.connect(panner);
    panner.connect(this.masterGain!);

    oscillator.start(startTime);
    oscillator.stop(startTime + 0.08);
  }

  private playBallBounce(
    context: AudioContext,
    startTime: number,
    event: Extract<GameAudioEvent, { type: 'ball-bounce' }>,
  ): void {
    const variant = this.impactVariant++ % 5;
    const key = `${event.material}:${variant}`;
    let buffer = this.impactBuffers.get(key);
    if (!buffer) {
      const samples = synthesizeBallImpact(
        event.material,
        context.sampleRate,
        variant,
      );
      buffer = context.createBuffer(1, samples.length, context.sampleRate);
      buffer.getChannelData(0).set(samples);
      this.impactBuffers.set(key, buffer);
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    const gain = context.createGain();
    // Preserve quiet grazes; reserve the sharpest, loudest impact for hard hits.
    gain.gain.value = 0.22 * Math.pow(event.intensity, 1.35);
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1800 + event.intensity * 10000;
    filter.Q.value = 0.5;
    const panner = createStereoPanner(context, event.pan);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(panner);
    panner.connect(this.masterGain!);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
      panner.disconnect();
    };
    source.start(startTime);
  }
}

const getNearbyImpactMaterial = (
  state: GameState,
  board: BoardDefinition,
): SurfaceMaterialName | null => {
  const { position, radius } = state.ball;
  const offset = state.tableNudge.offset;
  const wallMargin = radius + 8;

  if (
    position.x <= offset.x + wallMargin ||
    position.x >= offset.x + board.width - wallMargin ||
    position.y <= offset.y + wallMargin
  ) {
    return board.materials.walls;
  }

  for (const bumper of board.bumpers) {
    const distance = Math.hypot(
      position.x - (bumper.x + offset.x),
      position.y - (bumper.y + offset.y),
    );

    if (distance <= radius + bumper.radius + 10) {
      return bumper.material;
    }
  }

  for (const post of board.posts) {
    const distance = Math.hypot(
      position.x - (post.x + offset.x),
      position.y - (post.y + offset.y),
    );

    if (distance <= radius + post.radius + 10) {
      return post.material;
    }
  }

  for (const slingshot of board.slingshots) {
    const shifted = {
      ...slingshot,
      x: slingshot.x + offset.x,
      y: slingshot.y + offset.y,
    };

    if (
      distanceToOrientedSegment(
        position,
        shifted,
        shifted.width,
        shifted.angle,
      ) <=
      radius + shifted.height / 2 + 10
    ) {
      return shifted.material;
    }
  }

  for (const guide of getPlungerGuideSegments(board)) {
    const shiftedGuide = {
      ...guide,
      start: {
        x: guide.start.x + offset.x,
        y: guide.start.y + offset.y,
      },
      end: {
        x: guide.end.x + offset.x,
        y: guide.end.y + offset.y,
      },
    };
    if (
      getGuideDistance(position, shiftedGuide) <=
      radius + shiftedGuide.thickness / 2 + 10
    ) {
      return shiftedGuide.material;
    }
  }

  for (const guide of board.guides) {
    const shiftedGuide = isArcGuide(guide)
      ? {
          ...guide,
          center: {
            x: guide.center.x + offset.x,
            y: guide.center.y + offset.y,
          },
        }
      : {
          ...guide,
          start: {
            x: guide.start.x + offset.x,
            y: guide.start.y + offset.y,
          },
          end: {
            x: guide.end.x + offset.x,
            y: guide.end.y + offset.y,
          },
        };
    if (
      getGuideDistance(position, shiftedGuide) <=
      radius + shiftedGuide.thickness / 2 + 10
    ) {
      return shiftedGuide.material;
    }
  }

  for (const [index, flipper] of board.flippers.entries()) {
    const angle = state.flippers[index]?.angle ?? flipper.restingAngle;
    const shiftedFlipper = {
      ...flipper,
      x: flipper.x + offset.x,
      y: flipper.y + offset.y,
    };

    if (
      getDistanceToFlipperSurface(position, shiftedFlipper, angle) <=
      radius + 10
    ) {
      return shiftedFlipper.material;
    }
  }

  return null;
};

const distanceToOrientedSegment = (
  point: { x: number; y: number },
  element: { x: number; y: number },
  length: number,
  angle: number,
): number => {
  const halfLength = length / 2;
  const dx = Math.cos(angle) * halfLength;
  const dy = Math.sin(angle) * halfLength;
  const start = {
    x: element.x - dx,
    y: element.y - dy,
  };
  const end = {
    x: element.x + dx,
    y: element.y + dy,
  };
  const segmentX = end.x - start.x;
  const segmentY = end.y - start.y;
  const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;

  if (segmentLengthSquared === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  const projection = Math.min(
    1,
    Math.max(
      0,
      ((point.x - start.x) * segmentX + (point.y - start.y) * segmentY) /
        segmentLengthSquared,
    ),
  );
  const closestX = start.x + segmentX * projection;
  const closestY = start.y + segmentY * projection;

  return Math.hypot(point.x - closestX, point.y - closestY);
};

const getStereoPan = (x: number, width: number): number =>
  clamp((x / width) * 2 - 1, -0.9, 0.9);

const createStereoPanner = (context: AudioContext, pan: number): AudioNode => {
  if (typeof context.createStereoPanner !== 'function') {
    return context.createGain();
  }

  const panner = context.createStereoPanner();
  panner.pan.value = pan;
  return panner;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);
