import type { ContactData } from './contact-types';
import type { GameEvent } from './rules-types';

export interface DebugContact {
  point: { x: number; y: number };
  normal: { x: number; y: number };
  time: number;
}
let activeDebug: PhysicsDebug | undefined;

// Scoped to a synchronous simulation step; no observer remains installed afterward.
export const recordDebugContact = (contact: ContactData): void => {
  if (!activeDebug) return;
  activeDebug.contacts.push({
    point: { ...contact.point },
    normal: { ...contact.normal },
    time: activeDebug.time,
  });
  if (activeDebug.contacts.length > 80) activeDebug.contacts.shift();
};
export const recordDebugEvents = (events: GameEvent[]): void => {
  if (!activeDebug) return;
  for (const event of events) {
    activeDebug.events.unshift(
      `${activeDebug.time.toFixed(2)}s · ${event.type}${'index' in event ? ` #${event.index + 1}` : ''}`,
    );
  }
  activeDebug.events.length = Math.min(8, activeDebug.events.length);
};

export class PhysicsDebug {
  enabled = false;
  paused = false;
  speed = 1;
  time = 0;
  contacts: DebugContact[] = [];
  events: string[] = [];
  private pendingStep = false;

  step(): void {
    this.paused = true;
    this.pendingStep = true;
  }
  delta(realSeconds: number): number {
    if (this.pendingStep) {
      this.pendingStep = false;
      return 1 / 120;
    }
    return this.paused ? 0 : realSeconds * this.speed;
  }
  clear(): void {
    this.contacts = [];
    this.events = [];
    this.time = 0;
    this.pendingStep = false;
  }
  capture<T>(seconds: number, run: () => T): T {
    this.time += seconds;
    this.contacts = this.contacts.filter(
      (contact) => this.time - contact.time <= 0.4,
    );
    const previous = activeDebug;
    activeDebug = this.enabled ? this : undefined;
    try {
      return run();
    } finally {
      activeDebug = previous;
    }
  }
}
