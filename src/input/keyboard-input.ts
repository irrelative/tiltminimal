export interface InputState {
  leftPressed: boolean;
  rightPressed: boolean;
  launchPressed: boolean;
  nudgeLeftPressed: boolean;
  nudgeRightPressed: boolean;
  nudgeUpPressed: boolean;
}

export interface InputSource {
  connect(): void;
  disconnect(): void;
  getState(): InputState;
}

const LEFT_KEYS = new Set(['ArrowLeft', 'a', 'A']);
const RIGHT_KEYS = new Set(['ArrowRight', 'd', 'D']);
const LAUNCH_KEYS = new Set(['ArrowUp']);
const NUDGE_LEFT_KEYS = new Set(['z', 'Z']);
const NUDGE_RIGHT_KEYS = new Set(['/','?']);
const NUDGE_UP_KEYS = new Set([' ']);
const LEFT_CODES = new Set(['ShiftLeft']);
const RIGHT_CODES = new Set(['ShiftRight']);

export class KeyboardInput implements InputSource {
  private readonly state: InputState = {
    leftPressed: false,
    rightPressed: false,
    launchPressed: false,
    nudgeLeftPressed: false,
    nudgeRightPressed: false,
    nudgeUpPressed: false,
  };

  private connected = false;

  connect(): void {
    if (this.connected) {
      return;
    }

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.connected = true;
  }

  disconnect(): void {
    if (!this.connected) {
      return;
    }

    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.connected = false;
  }

  getState(): InputState {
    return { ...this.state };
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    this.setKeyState(event, true);
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.setKeyState(event, false);
  };

  private setKeyState(event: KeyboardEvent, pressed: boolean): void {
    const { code, key } = event;

    if (LEFT_KEYS.has(key) || LEFT_CODES.has(code)) {
      this.state.leftPressed = pressed;
      event.preventDefault();
    }

    if (RIGHT_KEYS.has(key) || RIGHT_CODES.has(code)) {
      this.state.rightPressed = pressed;
      event.preventDefault();
    }

    if (LAUNCH_KEYS.has(key)) {
      this.state.launchPressed = pressed;
      event.preventDefault();
    }

    if (NUDGE_LEFT_KEYS.has(key)) {
      this.state.nudgeLeftPressed = pressed;
      event.preventDefault();
    }

    if (NUDGE_RIGHT_KEYS.has(key)) {
      this.state.nudgeRightPressed = pressed;
      event.preventDefault();
    }

    if (NUDGE_UP_KEYS.has(key)) {
      this.state.nudgeUpPressed = pressed;
      event.preventDefault();
    }
  }
}

type TouchPointerKind =
  | 'left-flipper'
  | 'right-flipper'
  | 'gesture'
  | 'plunge'
  | 'consumed';

interface TouchPointerState {
  startX: number;
  startY: number;
  kind: TouchPointerKind;
}

const FLIPPER_ZONE_Y_RATIO = 0.72;
const RIGHT_SIDE_GESTURE_RATIO = 0.62;
const SWIPE_TRIGGER_PIXELS = 34;
const SWIPE_DOMINANCE_RATIO = 1.2;

export class PlayInput implements InputSource {
  private readonly keyboard = new KeyboardInput();
  private readonly touchPointers = new Map<number, TouchPointerState>();
  private touchLeftCount = 0;
  private touchRightCount = 0;
  private touchLaunchCount = 0;
  private queuedNudges: Pick<
    InputState,
    'nudgeLeftPressed' | 'nudgeRightPressed' | 'nudgeUpPressed'
  > = {
    nudgeLeftPressed: false,
    nudgeRightPressed: false,
    nudgeUpPressed: false,
  };
  private connected = false;

  constructor(private readonly element: HTMLElement) {}

  connect(): void {
    if (this.connected) {
      return;
    }

    this.keyboard.connect();
    this.element.addEventListener('pointerdown', this.onPointerDown);
    this.element.addEventListener('pointermove', this.onPointerMove);
    this.element.addEventListener('pointerup', this.onPointerUp);
    this.element.addEventListener('pointercancel', this.onPointerUp);
    this.connected = true;
  }

  disconnect(): void {
    if (!this.connected) {
      return;
    }

    this.keyboard.disconnect();
    this.element.removeEventListener('pointerdown', this.onPointerDown);
    this.element.removeEventListener('pointermove', this.onPointerMove);
    this.element.removeEventListener('pointerup', this.onPointerUp);
    this.element.removeEventListener('pointercancel', this.onPointerUp);
    this.touchPointers.clear();
    this.touchLeftCount = 0;
    this.touchRightCount = 0;
    this.touchLaunchCount = 0;
    this.connected = false;
  }

  getState(): InputState {
    const keyboardState = this.keyboard.getState();
    const nextState: InputState = {
      leftPressed: keyboardState.leftPressed || this.touchLeftCount > 0,
      rightPressed: keyboardState.rightPressed || this.touchRightCount > 0,
      launchPressed: keyboardState.launchPressed || this.touchLaunchCount > 0,
      nudgeLeftPressed:
        keyboardState.nudgeLeftPressed || this.queuedNudges.nudgeLeftPressed,
      nudgeRightPressed:
        keyboardState.nudgeRightPressed || this.queuedNudges.nudgeRightPressed,
      nudgeUpPressed:
        keyboardState.nudgeUpPressed || this.queuedNudges.nudgeUpPressed,
    };

    this.queuedNudges = {
      nudgeLeftPressed: false,
      nudgeRightPressed: false,
      nudgeUpPressed: false,
    };

    return nextState;
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (!isTouchLikePointer(event)) {
      return;
    }

    const point = getPointerPoint(this.element, event);
    const kind = getInitialTouchPointerKind(point);

    this.touchPointers.set(event.pointerId, {
      startX: point.localX,
      startY: point.localY,
      kind,
    });
    this.updateTouchCounts(kind, 1);
    event.preventDefault();
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (!isTouchLikePointer(event)) {
      return;
    }

    const pointer = this.touchPointers.get(event.pointerId);

    if (!pointer) {
      return;
    }

    const point = getPointerPoint(this.element, event);
    const deltaX = point.localX - pointer.startX;
    const deltaY = point.localY - pointer.startY;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    if (
      (pointer.kind === 'right-flipper' || pointer.kind === 'gesture') &&
      point.x >= RIGHT_SIDE_GESTURE_RATIO &&
      deltaY > SWIPE_TRIGGER_PIXELS &&
      absDeltaY > absDeltaX * SWIPE_DOMINANCE_RATIO
    ) {
      this.reassignPointer(event.pointerId, 'plunge');
      event.preventDefault();
      return;
    }

    if (
      pointer.kind !== 'gesture' ||
      Math.max(absDeltaX, absDeltaY) < SWIPE_TRIGGER_PIXELS
    ) {
      return;
    }

    if (absDeltaX > absDeltaY * SWIPE_DOMINANCE_RATIO) {
      this.queueNudge(deltaX < 0 ? 'left' : 'right');
      this.reassignPointer(event.pointerId, 'consumed');
      event.preventDefault();
      return;
    }

    if (absDeltaY > absDeltaX * SWIPE_DOMINANCE_RATIO && deltaY < 0) {
      this.queueNudge('up');
      this.reassignPointer(event.pointerId, 'consumed');
      event.preventDefault();
    }
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (!isTouchLikePointer(event)) {
      return;
    }

    const pointer = this.touchPointers.get(event.pointerId);

    if (!pointer) {
      return;
    }

    this.updateTouchCounts(pointer.kind, -1);
    this.touchPointers.delete(event.pointerId);
    event.preventDefault();
  };

  private reassignPointer(pointerId: number, nextKind: TouchPointerKind): void {
    const pointer = this.touchPointers.get(pointerId);

    if (!pointer || pointer.kind === nextKind) {
      return;
    }

    this.updateTouchCounts(pointer.kind, -1);
    pointer.kind = nextKind;
    this.updateTouchCounts(pointer.kind, 1);
    this.touchPointers.set(pointerId, pointer);
  }

  private updateTouchCounts(kind: TouchPointerKind, delta: 1 | -1): void {
    if (kind === 'left-flipper') {
      this.touchLeftCount = Math.max(0, this.touchLeftCount + delta);
    }

    if (kind === 'right-flipper') {
      this.touchRightCount = Math.max(0, this.touchRightCount + delta);
    }

    if (kind === 'plunge') {
      this.touchLaunchCount = Math.max(0, this.touchLaunchCount + delta);
    }
  }

  private queueNudge(direction: 'left' | 'right' | 'up'): void {
    if (direction === 'left') {
      this.queuedNudges.nudgeLeftPressed = true;
    }

    if (direction === 'right') {
      this.queuedNudges.nudgeRightPressed = true;
    }

    if (direction === 'up') {
      this.queuedNudges.nudgeUpPressed = true;
    }
  }
}

const isTouchLikePointer = (event: PointerEvent): boolean =>
  event.pointerType === 'touch' || event.pointerType === 'pen';

const getPointerPoint = (
  element: HTMLElement,
  event: PointerEvent,
): { x: number; y: number; localX: number; localY: number } => {
  const rect = element.getBoundingClientRect();
  const width = Math.max(rect.width, 1);
  const height = Math.max(rect.height, 1);
  const localX = event.clientX - rect.left;
  const localY = event.clientY - rect.top;

  return {
    x: localX / width,
    y: localY / height,
    localX,
    localY,
  };
};

const getInitialTouchPointerKind = (point: {
  x: number;
  y: number;
}): TouchPointerKind => {
  if (point.y >= FLIPPER_ZONE_Y_RATIO) {
    return point.x < 0.5 ? 'left-flipper' : 'right-flipper';
  }

  return 'gesture';
};
