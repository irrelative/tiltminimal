import { classicTable } from './boards/classic-table';
import { GameLoop } from './game/game-loop';
import { createInitialGameState } from './game/game-state';
import { KeyboardInput } from './input/keyboard-input';
import { CanvasRenderer } from './render/canvas-renderer';
import './styles.css';

const canvas = document.querySelector<HTMLCanvasElement>('#game');
const masthead = document.querySelector<HTMLElement>('.masthead');
const mastheadCloseButton = document.querySelector<HTMLButtonElement>(
  '.masthead-close',
);

if (!canvas) {
  throw new Error('Expected #game canvas to exist.');
}

if (!masthead) {
  throw new Error('Expected .masthead element to exist.');
}

if (!mastheadCloseButton) {
  throw new Error('Expected .masthead-close button to exist.');
}

const board = classicTable;
const input = new KeyboardInput();
const renderer = new CanvasRenderer(canvas, board);
const state = createInitialGameState(board);
const loop = new GameLoop(state, board, input, renderer);

mastheadCloseButton.addEventListener('click', () => {
  masthead.hidden = true;
});

loop.start();
