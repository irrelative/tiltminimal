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
  private unlockBound = false;
  private noiseBuffer: AudioBuffer | null = null;
  private lastBounceTime = -Infinity;

  connect(): void {
    if (this.unlockBound || typeof window === 'undefined') {
      return;
    }

    window.addEventListener('pointerdown', this.unlockAudio, { passive: true });
    window.addEventListener('keydown', this.unlockAudio, { passive: true });
    this.unlockBound = true;
  }

  disconnect(): void {
    if (!this.unlockBound || typeof window === 'undefined') {
      return;
    }

    window.removeEventListener('pointerdown', this.unlockAudio);
    window.removeEventListener('keydown', this.unlockAudio);
    this.unlockBound = false;
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

    if (!context || context.state !== 'suspended') {
      return;
    }

    void context.resume();
  };

  private getContext(): AudioContext | null {
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
    return this.context;
  }

  private playFlipperTrigger(
    context: AudioContext,
    startTime: number,
    event: Extract<GameAudioEvent, { type: 'flipper-trigger' }>,
  ): void {
    const oscillator = context.createOscillator();
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(220, startTime);
    oscillator.frequency.exponentialRampToValueAtTime(110, startTime + 0.045);

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
    panner.connect(context.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + 0.08);
  }

  private playBallBounce(
    context: AudioContext,
    startTime: number,
    event: Extract<GameAudioEvent, { type: 'ball-bounce' }>,
  ): void {
    const tone = context.createOscillator();
    tone.type = getBounceWaveform(event.material);
    tone.frequency.setValueAtTime(
      getBounceFrequency(event.material),
      startTime,
    );
    tone.frequency.exponentialRampToValueAtTime(
      Math.max(90, getBounceFrequency(event.material) * 0.58),
      startTime + 0.08,
    );

    const toneGain = context.createGain();
    toneGain.gain.setValueAtTime(0.0001, startTime);
    toneGain.gain.exponentialRampToValueAtTime(
      0.065 * event.intensity,
      startTime + 0.003,
    );
    toneGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.1);

    const panner = createStereoPanner(context, event.pan);
    tone.connect(toneGain);
    toneGain.connect(panner);

    const noiseSource = context.createBufferSource();
    noiseSource.buffer = this.getNoiseBuffer(context);
    const noiseFilter = context.createBiquadFilter();
    noiseFilter.type =
      event.material === 'metalGuide' ? 'highpass' : 'bandpass';
    noiseFilter.frequency.setValueAtTime(
      event.material === 'metalGuide' ? 1800 : 720,
      startTime,
    );

    const noiseGain = context.createGain();
    noiseGain.gain.setValueAtTime(0.0001, startTime);
    noiseGain.gain.exponentialRampToValueAtTime(
      0.03 * event.intensity,
      startTime + 0.002,
    );
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.045);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(panner);
    panner.connect(context.destination);

    tone.start(startTime);
    tone.stop(startTime + 0.11);
    noiseSource.start(startTime);
    noiseSource.stop(startTime + 0.05);
  }

  private getNoiseBuffer(context: AudioContext): AudioBuffer {
    if (this.noiseBuffer) {
      return this.noiseBuffer;
    }

    const sampleRate = context.sampleRate;
    const length = Math.floor(sampleRate * 0.14);
    const buffer = context.createBuffer(1, length, sampleRate);
    const channel = buffer.getChannelData(0);

    for (let index = 0; index < length; index += 1) {
      channel[index] = (Math.random() * 2 - 1) * (1 - index / length);
    }

    this.noiseBuffer = buffer;
    return buffer;
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
    const shiftedGuide =
      isArcGuide(guide)
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

const getBounceFrequency = (material: SurfaceMaterialName): number => {
  switch (material) {
    case 'metalGuide':
      return 960;
    case 'rubberPost':
      return 380;
    case 'flipperRubber':
      return 290;
    case 'playfieldWood':
      return 220;
  }
};

const getBounceWaveform = (material: SurfaceMaterialName): OscillatorType => {
  switch (material) {
    case 'metalGuide':
      return 'triangle';
    case 'rubberPost':
      return 'sine';
    case 'flipperRubber':
      return 'square';
    case 'playfieldWood':
      return 'triangle';
  }
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
