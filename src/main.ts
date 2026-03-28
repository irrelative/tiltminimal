import {
  BUILT_IN_TABLES,
  cloneBoardDefinition,
  createBlankTable,
  createTableId,
  type TableRecord,
} from './boards/table-library';
import {
  addBumper,
  addFlipper,
  deleteSelection,
  hitTestSelection,
  moveSelection,
  updateSelectedNumericField,
} from './editor/table-editor';
import type { EditorSelection, EditorTool } from './editor/editor-types';
import {
  deleteCustomTable,
  loadTablesState,
  resetBuiltInTable,
  setActiveTableId,
  upsertTable,
} from './editor/table-storage';
import { GameLoop } from './game/game-loop';
import { createInitialGameState } from './game/game-state';
import { KeyboardInput } from './input/keyboard-input';
import { CanvasRenderer } from './render/canvas-renderer';
import type { BoardDefinition, Point } from './types/board-definition';
import './styles.css';

type AppMode = 'edit' | 'play';
type AppRoute = 'editor' | 'play';
type DebugDestination = 'board-editor' | 'play-test';

const DEBUG_HASHES: Record<DebugDestination, string> = {
  'board-editor': '#debug-board-editor',
  'play-test': '#debug-play-test',
};

interface AppState {
  tables: TableRecord[];
  activeTableId: string;
  mode: AppMode;
  tool: EditorTool;
  selection: EditorSelection;
  dragging: boolean;
  dragOffset: Point | null;
  draftPosition: Point | null;
  loop: GameLoop | null;
  input: KeyboardInput | null;
}

const queryRequired = <T extends Element>(selector: string): T => {
  const element = document.querySelector<T>(selector);

  if (!element) {
    throw new Error(`Expected ${selector} to exist.`);
  }

  return element;
};

const canvas = queryRequired<HTMLCanvasElement>('#game');
const tableSelect = queryRequired<HTMLSelectElement>('#table-select');
const newTableButton = queryRequired<HTMLButtonElement>('#new-table');
const duplicateTableButton =
  queryRequired<HTMLButtonElement>('#duplicate-table');
const playToggleButton = queryRequired<HTMLButtonElement>('#play-toggle');
const removeTableButton = queryRequired<HTMLButtonElement>('#remove-table');
const tableNameInput = queryRequired<HTMLInputElement>('#table-name');
const tableMeta = queryRequired<HTMLElement>('#table-meta');
const selectionLabel = queryRequired<HTMLElement>('#selection-label');
const selectionFields = queryRequired<HTMLElement>('#selection-fields');
const deleteSelectionButton =
  queryRequired<HTMLButtonElement>('#delete-selection');
const modeTitle = queryRequired<HTMLElement>('#mode-title');
const modeCopy = queryRequired<HTMLElement>('#mode-copy');
const debugLinkEditor = queryRequired<HTMLAnchorElement>('#debug-link-editor');
const debugLinkPlay = queryRequired<HTMLAnchorElement>('#debug-link-play');

const renderer = new CanvasRenderer(canvas);
const loadedState = loadTablesState();
const appRoute = getAppRoute(window.location.pathname);

const state: AppState = {
  tables: loadedState.tables,
  activeTableId: loadedState.activeTableId,
  mode: appRoute === 'editor' ? 'edit' : 'play',
  tool: 'select',
  selection: { kind: 'none' },
  dragging: false,
  dragOffset: null,
  draftPosition: null,
  loop: null,
  input: null,
};

document.body.dataset.route = appRoute;

if (BUILT_IN_TABLES.length === 0) {
  throw new Error('Expected at least one built-in table.');
}

if (appRoute === 'editor') {
  bootEditorRoute();
} else {
  bootPlayRoute();
}

function bootEditorRoute(): void {
  debugLinkEditor.href = DEBUG_HASHES['board-editor'];
  debugLinkEditor.textContent = 'Board editor';
  debugLinkPlay.href = DEBUG_HASHES['play-test'];
  debugLinkPlay.textContent = 'Play test';

  window.addEventListener('hashchange', () => {
    applyHashNavigation();
  });

  tableSelect.addEventListener('change', () => {
    setAppMode('edit', false);
    state.activeTableId = tableSelect.value;
    state.selection = { kind: 'none' };
    state.tool = 'select';
    state.draftPosition = null;
    setActiveTableId(state.activeTableId);
    renderApp();
  });

  newTableButton.addEventListener('click', () => {
    setAppMode('edit', false);

    const table = createCustomRecord(createBlankTable(nextCustomTableName()));
    state.tables = [...state.tables, table];
    state.activeTableId = table.id;
    state.selection = { kind: 'none' };
    state.tool = 'select';
    persistTable(table);
    renderApp();
  });

  duplicateTableButton.addEventListener('click', () => {
    setAppMode('edit', false);

    const active = getActiveTable();
    const table = createCustomRecord({
      ...cloneBoardDefinition(active.board),
      name: `${active.board.name} Copy`,
    });

    state.tables = [...state.tables, table];
    state.activeTableId = table.id;
    state.selection = { kind: 'none' };
    state.tool = 'select';
    persistTable(table);
    renderApp();
  });

  playToggleButton.addEventListener('click', () => {
    navigateToDebugDestination(
      state.mode === 'play' ? 'board-editor' : 'play-test',
    );
  });

  removeTableButton.addEventListener('click', () => {
    setAppMode('edit', false);

    const active = getActiveTable();

    if (active.builtIn) {
      resetBuiltInTable(active.id);
      reloadTables(active.id);
      return;
    }

    deleteCustomTable(active.id);
    reloadTables();
  });

  tableNameInput.addEventListener('input', () => {
    const active = getActiveTable();
    const name = tableNameInput.value.trim() || active.board.name;

    replaceActiveBoard(
      {
        ...active.board,
        name,
      },
      true,
    );
  });

  selectionFields.addEventListener('input', (event) => {
    const target = event.target;

    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    const field = target.dataset.field;

    if (!field) {
      return;
    }

    const value = Number(target.value);

    if (!Number.isFinite(value)) {
      return;
    }

    replaceActiveBoard(
      updateSelectedNumericField(
        getActiveTable().board,
        state.selection,
        field,
        value,
      ),
      true,
    );
  });

  deleteSelectionButton.addEventListener('click', () => {
    removeCurrentSelection();
  });

  document
    .querySelectorAll<HTMLButtonElement>('.tool-button')
    .forEach((button) => {
      button.addEventListener('click', () => {
        if (state.mode !== 'edit') {
          navigateToDebugDestination('board-editor');
        }

        state.tool = button.dataset.tool as EditorTool;
        state.draftPosition = null;
        renderApp();
      });
    });

  canvas.addEventListener('pointerdown', (event) => {
    if (state.mode !== 'edit') {
      return;
    }

    const point = getBoardPoint(event);
    canvas.setPointerCapture(event.pointerId);

    if (state.tool === 'add-bumper') {
      const result = addBumper(getActiveTable().board, point);

      state.selection = result.selection;
      state.tool = 'select';
      state.dragging = true;
      state.dragOffset = { x: 0, y: 0 };
      state.draftPosition = null;
      replaceActiveBoard(result.board, false);
      renderApp();
      return;
    }

    if (
      state.tool === 'add-left-flipper' ||
      state.tool === 'add-right-flipper'
    ) {
      const result = addFlipper(
        getActiveTable().board,
        state.tool === 'add-left-flipper' ? 'left' : 'right',
        point,
      );

      state.selection = result.selection;
      state.tool = 'select';
      state.dragging = true;
      state.dragOffset = { x: 0, y: 0 };
      state.draftPosition = null;
      replaceActiveBoard(result.board, false);
      renderApp();
      return;
    }

    state.selection = hitTestSelection(getActiveTable().board, point);
    state.dragging = state.selection.kind !== 'none';
    state.dragOffset = getDragOffset(
      getActiveTable().board,
      state.selection,
      point,
    );
    renderApp();
  });

  canvas.addEventListener('pointermove', (event) => {
    if (state.mode !== 'edit') {
      return;
    }

    const point = getBoardPoint(event);

    if (state.dragging && state.selection.kind !== 'none') {
      const dragOffset = state.dragOffset ?? { x: 0, y: 0 };

      replaceActiveBoard(
        moveSelection(getActiveTable().board, state.selection, {
          x: point.x - dragOffset.x,
          y: point.y - dragOffset.y,
        }),
        false,
      );
      renderApp();
      return;
    }

    state.draftPosition = state.tool === 'select' ? null : point;
    renderApp();
  });

  canvas.addEventListener('pointerup', () => {
    if (!state.dragging) {
      return;
    }

    state.dragging = false;
    state.dragOffset = null;
    persistTable(getActiveTable());
    renderApp();
  });

  canvas.addEventListener('pointercancel', () => {
    state.dragging = false;
    state.dragOffset = null;
    renderApp();
  });

  canvas.addEventListener('pointerleave', () => {
    if (state.dragging) {
      return;
    }

    state.draftPosition = null;
    renderApp();
  });

  window.addEventListener('keydown', (event) => {
    if (state.mode !== 'edit') {
      if (event.key === 'Escape') {
        navigateToDebugDestination('board-editor');
      }

      return;
    }

    if (event.key === 'Escape') {
      state.tool = 'select';
      state.selection = { kind: 'none' };
      state.draftPosition = null;
      renderApp();
      return;
    }

    if (event.key !== 'Delete' && event.key !== 'Backspace') {
      return;
    }

    const activeElement = document.activeElement;

    if (
      activeElement instanceof HTMLInputElement ||
      activeElement instanceof HTMLSelectElement ||
      activeElement instanceof HTMLTextAreaElement
    ) {
      return;
    }

    event.preventDefault();
    removeCurrentSelection();
  });

  renderApp();
  applyHashNavigation();
}

function bootPlayRoute(): void {
  const board = cloneBoardDefinition(getActiveTable().board);
  const input = new KeyboardInput();
  const loop = new GameLoop(
    createInitialGameState(board),
    board,
    input,
    renderer,
  );

  state.mode = 'play';
  state.input = input;
  state.loop = loop;

  modeTitle.textContent = board.name;
  modeCopy.textContent =
    'Use Space to launch. Left Shift / Z / Left Arrow and Right Shift / ? / Right Arrow control the flippers.';
  debugLinkEditor.href = '/editor';
  debugLinkEditor.textContent = 'Open editor';
  debugLinkPlay.href = '/';
  debugLinkPlay.textContent = 'Game';
  debugLinkEditor.classList.remove('is-active');
  debugLinkEditor.setAttribute('aria-current', 'false');
  debugLinkPlay.classList.add('is-active');
  debugLinkPlay.setAttribute('aria-current', 'page');

  loop.start();
}

function renderApp(): void {
  syncTableList();
  syncToolButtons();
  syncTablePanel();
  syncSelectionPanel();
  syncModeCopy();
  syncDebugMenu();

  if (state.mode === 'edit') {
    renderer.renderEditor(
      getActiveTable().board,
      state.selection,
      state.tool === 'select' ? null : state.draftPosition,
    );
  }
}

function syncTableList(): void {
  tableSelect.replaceChildren(
    ...state.tables.map((table) => {
      const option = document.createElement('option');
      option.value = table.id;
      option.selected = table.id === state.activeTableId;
      option.textContent = table.builtIn
        ? `${table.board.name} (built-in)`
        : table.board.name;

      return option;
    }),
  );
}

function syncToolButtons(): void {
  document
    .querySelectorAll<HTMLButtonElement>('.tool-button')
    .forEach((button) => {
      button.classList.toggle('is-active', button.dataset.tool === state.tool);
    });
}

function syncTablePanel(): void {
  const active = getActiveTable();

  tableNameInput.value = active.board.name;
  tableMeta.textContent = `${active.builtIn ? 'Built-in table' : 'Custom table'} · ${active.board.bumpers.length} bumpers · ${active.board.flippers.length} flippers`;
  removeTableButton.textContent = active.builtIn ? 'Reset built-in' : 'Delete';
}

function syncSelectionPanel(): void {
  const active = getActiveTable();

  if (state.selection.kind === 'none') {
    selectionLabel.textContent = 'Nothing selected.';
    deleteSelectionButton.disabled = true;
    selectionFields.replaceChildren();
    return;
  }

  deleteSelectionButton.disabled = state.selection.kind === 'launch-position';
  selectionFields.replaceChildren();

  if (state.selection.kind === 'launch-position') {
    selectionLabel.textContent = 'Launch position';
    selectionFields.append(
      createNumericField('x', 'X', active.board.launchPosition.x),
      createNumericField('y', 'Y', active.board.launchPosition.y),
    );
    return;
  }

  if (
    state.selection.kind === 'bumper' &&
    state.selection.index !== undefined
  ) {
    const bumper = active.board.bumpers[state.selection.index];

    if (!bumper) {
      return;
    }

    selectionLabel.textContent = `Bumper ${state.selection.index + 1}`;
    selectionFields.append(
      createNumericField('x', 'X', bumper.x),
      createNumericField('y', 'Y', bumper.y),
      createNumericField('radius', 'Radius', bumper.radius),
      createNumericField('score', 'Score', bumper.score),
    );
    return;
  }

  if (
    state.selection.kind === 'guide' &&
    state.selection.index !== undefined
  ) {
    const guide = active.board.guides[state.selection.index];

    if (!guide) {
      return;
    }

    selectionLabel.textContent = `Guide ${state.selection.index + 1}`;
    selectionFields.append(
      createNumericField('startX', 'Start X', guide.start.x),
      createNumericField('startY', 'Start Y', guide.start.y),
      createNumericField('endX', 'End X', guide.end.x),
      createNumericField('endY', 'End Y', guide.end.y),
      createNumericField('thickness', 'Thickness', guide.thickness),
    );
    return;
  }

  if (
    state.selection.kind === 'flipper' &&
    state.selection.index !== undefined
  ) {
    const flipper = active.board.flippers[state.selection.index];

    if (!flipper) {
      return;
    }

    selectionLabel.textContent = `${capitalize(flipper.side)} flipper ${state.selection.index + 1}`;
    selectionFields.append(
      createReadOnlyField('Side', capitalize(flipper.side)),
      createNumericField('x', 'Pivot X', flipper.x),
      createNumericField('y', 'Pivot Y', flipper.y),
      createNumericField('length', 'Length', flipper.length),
      createNumericField('thickness', 'Thickness', flipper.thickness),
    );
  }
}

function syncModeCopy(): void {
  if (state.mode === 'play') {
    modeTitle.textContent = 'Playing current table';
    modeCopy.textContent =
      'Use Space to launch and Left Shift / Z / Left Arrow plus Right Shift / ? / Right Arrow to flip. Press Play Test again or Escape to return to editing.';
    playToggleButton.textContent = 'Back to editor';
    playToggleButton.classList.add('accent-button');
    return;
  }

  modeTitle.textContent = 'Editing table';
  modeCopy.textContent =
    'Click to select. Drag to move. Press Delete to remove the selected element.';
  playToggleButton.textContent = 'Play Test';
  playToggleButton.classList.add('accent-button');
}

function syncDebugMenu(): void {
  const editorActive = state.mode === 'edit';
  debugLinkEditor.classList.toggle('is-active', editorActive);
  debugLinkEditor.setAttribute(
    'aria-current',
    editorActive ? 'page' : 'false',
  );
  debugLinkPlay.classList.toggle('is-active', !editorActive);
  debugLinkPlay.setAttribute('aria-current', !editorActive ? 'page' : 'false');
}

function getActiveTable(): TableRecord {
  const table = state.tables.find(
    (candidate) => candidate.id === state.activeTableId,
  );

  if (!table) {
    throw new Error(`Missing table ${state.activeTableId}.`);
  }

  return table;
}

function replaceActiveBoard(board: BoardDefinition, persist: boolean): void {
  const active = getActiveTable();
  const nextTable = {
    ...active,
    board: cloneBoardDefinition(board),
  };

  state.tables = state.tables.map((table) =>
    table.id === nextTable.id ? nextTable : table,
  );

  if (persist) {
    persistTable(nextTable);
  }
}

function persistTable(table: TableRecord): void {
  upsertTable({
    ...table,
    board: cloneBoardDefinition(table.board),
  });
  setActiveTableId(table.id);
}

function reloadTables(preferredTableId?: string): void {
  const loaded = loadTablesState();

  state.tables = loaded.tables;
  state.activeTableId =
    preferredTableId &&
    loaded.tables.some((table) => table.id === preferredTableId)
      ? preferredTableId
      : loaded.activeTableId;
  state.selection = { kind: 'none' };
  state.tool = 'select';
  state.draftPosition = null;
  setActiveTableId(state.activeTableId);
  renderApp();
}

function applyHashNavigation(): void {
  const destination = getDebugDestinationFromHash(window.location.hash);

  setAppMode(destination === 'play-test' ? 'play' : 'edit', false);
  renderApp();
}

function navigateToDebugDestination(destination: DebugDestination): void {
  const nextHash = DEBUG_HASHES[destination];

  if (window.location.hash === nextHash) {
    applyHashNavigation();
    return;
  }

  window.location.hash = nextHash;
}

function getDebugDestinationFromHash(hash: string): DebugDestination {
  if (hash === DEBUG_HASHES['play-test']) {
    return 'play-test';
  }

  return 'board-editor';
}

function startPlayMode(): void {
  stopPlayMode();

  const board = cloneBoardDefinition(getActiveTable().board);
  const input = new KeyboardInput();
  const loop = new GameLoop(
    createInitialGameState(board),
    board,
    input,
    renderer,
  );

  state.mode = 'play';
  state.selection = { kind: 'none' };
  state.tool = 'select';
  state.draftPosition = null;
  state.dragging = false;
  state.dragOffset = null;
  state.input = input;
  state.loop = loop;
  loop.start();
}

function stopPlayMode(): void {
  state.loop?.stop();
  state.loop = null;
  state.input = null;
  state.mode = 'edit';
}

function setAppMode(mode: AppMode, renderImmediately: boolean): void {
  if (mode === 'play') {
    if (state.mode !== 'play') {
      startPlayMode();
    }
  } else if (state.mode === 'play') {
    stopPlayMode();
  }

  if (renderImmediately) {
    renderApp();
  }
}

function removeCurrentSelection(): void {
  if (
    state.selection.kind === 'none' ||
    state.selection.kind === 'launch-position'
  ) {
    return;
  }

  const result = deleteSelection(getActiveTable().board, state.selection);
  state.selection = result.selection;
  replaceActiveBoard(result.board, true);
  renderApp();
}

function getBoardPoint(event: PointerEvent): Point {
  const rect = canvas.getBoundingClientRect();
  const board = getActiveTable().board;
  const scaleX = board.width / rect.width;
  const scaleY = board.height / rect.height;

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function getDragOffset(
  board: BoardDefinition,
  selection: EditorSelection,
  point: Point,
): Point | null {
  if (selection.kind === 'launch-position') {
    return {
      x: point.x - board.launchPosition.x,
      y: point.y - board.launchPosition.y,
    };
  }

  if (selection.kind === 'bumper' && selection.index !== undefined) {
    const bumper = board.bumpers[selection.index];

    if (!bumper) {
      return null;
    }

    return {
      x: point.x - bumper.x,
      y: point.y - bumper.y,
    };
  }

  if (selection.kind === 'guide' && selection.index !== undefined) {
    const guide = board.guides[selection.index];

    if (!guide) {
      return null;
    }

    return {
      x: point.x - guide.start.x,
      y: point.y - guide.start.y,
    };
  }

  if (selection.kind === 'flipper' && selection.index !== undefined) {
    const flipper = board.flippers[selection.index];

    if (!flipper) {
      return null;
    }

    return {
      x: point.x - flipper.x,
      y: point.y - flipper.y,
    };
  }

  return null;
}

function createCustomRecord(board: BoardDefinition): TableRecord {
  return {
    id: createTableId(),
    board: cloneBoardDefinition(board),
    builtIn: false,
  };
}

function nextCustomTableName(): string {
  const customCount = state.tables.filter((table) => !table.builtIn).length + 1;

  return `Custom Table ${customCount}`;
}

function createNumericField(
  field: string,
  label: string,
  value: number,
): HTMLElement {
  const wrapper = document.createElement('label');
  wrapper.className = 'field';
  const labelText = document.createElement('span');
  labelText.textContent = label;
  const input = document.createElement('input');
  input.type = 'number';
  input.step = '1';
  input.value = String(Math.round(value));
  input.dataset.field = field;
  wrapper.append(labelText, input);

  return wrapper;
}

function createReadOnlyField(label: string, value: string): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'field';
  wrapper.dataset.span = 'full';
  wrapper.dataset.type = 'readonly';
  const labelText = document.createElement('span');
  labelText.textContent = label;
  const valueText = document.createElement('strong');
  valueText.textContent = value;
  wrapper.append(labelText, valueText);

  return wrapper;
}

function capitalize(value: string): string {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}

function getAppRoute(pathname: string): AppRoute {
  return pathname === '/editor' || pathname === '/editor/' ? 'editor' : 'play';
}
