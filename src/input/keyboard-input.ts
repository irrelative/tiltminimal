export interface InputState {
  leftPressed: boolean;
  rightPressed: boolean;
  launchPressed: boolean;
  nudgeLeftPressed: boolean;
  nudgeRightPressed: boolean;
  nudgeUpPressed: boolean;
}

const LEFT_KEYS = new Set(['ArrowLeft', 'a', 'A']);
const RIGHT_KEYS = new Set(['ArrowRight', 'd', 'D']);
const LAUNCH_KEYS = new Set(['ArrowUp']);
const NUDGE_LEFT_KEYS = new Set(['z', 'Z']);
const NUDGE_RIGHT_KEYS = new Set(['/','?']);
const NUDGE_UP_KEYS = new Set([' ']);
const LEFT_CODES = new Set(['ShiftLeft']);
const RIGHT_CODES = new Set(['ShiftRight']);

export class KeyboardInput {
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
