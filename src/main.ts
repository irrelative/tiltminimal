import { classicTable } from './boards/classic-table';
import { GameLoop } from './game/game-loop';
import { createInitialGameState } from './game/game-state';
import { KeyboardInput } from './input/keyboard-input';
import { CanvasRenderer } from './render/canvas-renderer';
import './styles.css';

const MASTHEAD_HIDDEN_STORAGE_KEY = 'pball-web.masthead-hidden';

const canvas = document.querySelector<HTMLCanvasElement>('#game');
const masthead = document.querySelector<HTMLElement>('.masthead');
const mastheadCloseButton = document.querySelector<HTMLButtonElement>(
  '.masthead-close',
);
const resetBallButton = document.querySelector<HTMLButtonElement>('#reset-ball');
const debugStatus = document.querySelector<HTMLElement>('#debug-status');
const debugPosition = document.querySelector<HTMLElement>('#debug-position');
const debugVelocity = document.querySelector<HTMLElement>('#debug-velocity');
const debugSpin = document.querySelector<HTMLElement>('#debug-spin');

if (!canvas) {
  throw new Error('Expected #game canvas to exist.');
}

if (!masthead) {
  throw new Error('Expected .masthead element to exist.');
}

if (!mastheadCloseButton) {
  throw new Error('Expected .masthead-close button to exist.');
}

if (!resetBallButton || !debugStatus || !debugPosition || !debugVelocity || !debugSpin) {
  throw new Error('Expected debug controls to exist.');
}

const board = classicTable;
const input = new KeyboardInput();
const renderer = new CanvasRenderer(canvas, board);
const state = createInitialGameState(board);
const loop = new GameLoop(state, board, input, renderer);

restoreMastheadState(masthead);

mastheadCloseButton.addEventListener('click', () => {
  masthead.hidden = true;
  window.localStorage.setItem(MASTHEAD_HIDDEN_STORAGE_KEY, 'true');
});

resetBallButton.addEventListener('click', () => {
  loop.resetBall();
});

loop.setOnStateChange((nextState) => {
  debugStatus.textContent = nextState.status;
  debugPosition.textContent = formatVector2(
    nextState.ball.position.x,
    nextState.ball.position.y,
  );
  debugVelocity.textContent = formatVector2(
    nextState.ball.linearVelocity.x,
    nextState.ball.linearVelocity.y,
  );
  debugSpin.textContent = formatVector3(
    nextState.ball.angularVelocity.x,
    nextState.ball.angularVelocity.y,
    nextState.ball.angularVelocity.z,
  );
});

loop.start();

function restoreMastheadState(target: HTMLElement): void {
  if (window.localStorage.getItem(MASTHEAD_HIDDEN_STORAGE_KEY) === 'true') {
    target.hidden = true;
  }
}

function formatVector2(x: number, y: number): string {
  return `${Math.round(x)}, ${Math.round(y)}`;
}

function formatVector3(x: number, y: number, z: number): string {
  return `${Math.round(x)}, ${Math.round(y)}, ${Math.round(z)}`;
}
