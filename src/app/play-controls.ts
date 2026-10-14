import type { GameLoop } from '../game/game-loop';
import type { GameState } from '../game/game-state';

/** Screen-space controls shared by every playable table. */
export class PlayControls {
  private readonly pause = document.createElement('button');
  private readonly panel = document.createElement('section');
  private readonly title = document.createElement('h2');
  private readonly message = document.createElement('p');
  private readonly guidance = document.createElement('div');
  private readonly replay = document.createElement('button');
  private readonly replayHint = document.createElement('p');
  private loop?: GameLoop;
  private state?: GameState;
  private userPaused = false;
  private ruleCardOpen = false;
  private launchDismissed = false;
  private launchBall?: GameState['ball'];

  constructor(
    host: HTMLElement,
    private readonly closeRuleCard: () => void,
  ) {
    this.pause.type = this.replay.type = 'button';
    this.pause.className = 'play-pause';
    this.pause.textContent = 'Pause';
    this.pause.setAttribute('aria-pressed', 'false');
    this.panel.className = 'play-status';
    this.title.id = 'play-status-title';
    this.panel.setAttribute('aria-labelledby', this.title.id);
    this.message.setAttribute('role', 'status');
    this.guidance.className = 'launch-guidance';
    for (const text of [
      'Keyboard: hold ↑, then release to launch. Use ← / → for flippers.',
      'Touch: swipe down on the right, hold, then lift to launch. Hold the lower corners for flippers.',
    ]) {
      const line = document.createElement('p');
      line.textContent = text;
      this.guidance.append(line);
    }
    this.replayHint.textContent =
      'Hold ↑ to start again, or choose Play again.';
    this.replayHint.className = 'replay-hint';
    this.replay.textContent = 'Play again';
    this.replay.hidden = true;
    this.panel.append(
      this.title,
      this.message,
      this.guidance,
      this.replayHint,
      this.replay,
    );
    host.replaceChildren(this.pause, this.panel);
    const dismissLaunch = () => {
      if (this.panel.getAttribute('role') !== 'button') return;
      this.launchDismissed = true;
      this.render();
    };
    this.panel.addEventListener('click', dismissLaunch);
    this.panel.addEventListener('keydown', (event) => {
      if (
        this.panel.getAttribute('role') === 'button' &&
        (event.key === 'Enter' || event.key === ' ')
      ) {
        event.preventDefault();
        dismissLaunch();
      }
    });
    this.pause.addEventListener('click', () => {
      if (!this.loop) return;
      if (this.loop.suspended || this.loop.debug.paused) {
        // Normalize debug-only suspension so Resume also clears held input.
        this.loop.suspended = true;
        this.userPaused = false;
        this.loop.debug.paused = false;
        this.closeRuleCard();
      } else {
        this.userPaused = true;
      }
      this.syncSuspension();
      this.render();
    });
    this.replay.addEventListener('click', () => {
      if (this.state?.status !== 'game-over' || !this.loop) return;
      this.loop.restartGame();
      this.pause.focus();
    });
  }

  setRuleCardOpen(open: boolean): void {
    this.ruleCardOpen = open;
    this.syncSuspension();
    this.render();
  }

  observe(state: GameState, loop: GameLoop): void {
    if (state.status !== 'waiting-launch' || state.ball !== this.launchBall) {
      this.launchDismissed = false;
    }
    this.launchBall = state.ball;
    this.state = state;
    this.loop = loop;
    this.syncSuspension();
    this.render();
  }

  private syncSuspension(): void {
    if (this.loop) this.loop.suspended = this.userPaused || this.ruleCardOpen;
  }

  private render(): void {
    if (!this.state || !this.loop) return;
    const paused = this.loop.suspended || this.loop.debug.paused;
    const over = this.state.status === 'game-over';
    const waiting = this.state.status === 'waiting-launch';
    const showGuidance =
      waiting &&
      this.state.plunger.pullback === 0 &&
      !paused &&
      !this.launchDismissed;
    const pauseLabel = paused ? 'Resume' : 'Pause';
    if (this.pause.textContent !== pauseLabel) {
      this.pause.textContent = pauseLabel;
      this.pause.setAttribute('aria-pressed', String(paused));
    }
    this.panel.hidden = !paused && !over && !showGuidance;
    this.panel.classList.toggle(
      'interactive',
      (over && !paused) || showGuidance,
    );
    this.panel.classList.toggle('dismissable', showGuidance);
    if (showGuidance) {
      this.panel.setAttribute('role', 'button');
      this.panel.setAttribute(
        'aria-label',
        'Ready to launch. Dismiss launch guidance',
      );
      this.panel.tabIndex = 0;
    } else {
      this.panel.removeAttribute('role');
      this.panel.removeAttribute('aria-label');
      this.panel.removeAttribute('tabindex');
    }
    this.guidance.hidden = !showGuidance;
    this.replay.hidden = !over || paused;
    this.replayHint.hidden = !over || paused;
    const title = paused ? 'Paused' : over ? 'Game over' : 'Ready to launch';
    if (this.title.textContent !== title) this.title.textContent = title;
    const text = paused
      ? 'Use Resume when you’re ready to play.'
      : over
        ? `Final score: ${this.state.score.toLocaleString()}`
        : this.state.lockedBalls.length
          ? 'Ball locked. Launch the replacement ball to continue.'
          : `Ball ${this.state.rules.currentBall} of ${this.state.rules.ballsPerGame}`;
    if (this.message.textContent !== text) this.message.textContent = text;
  }
}
