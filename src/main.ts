import {
  BUILT_IN_TABLES,
  createBlankTable,
  createTableId,
  type TableRecord,
} from './boards/table-library';
import { renderSelectionPanel } from './app/editor-selection-panel';
import {
  startStandalonePlaySession,
  syncPlayRoutePanel as renderPlayRoutePanel,
} from './app/play-session';
import {
  startPhysicsSandboxSession,
  syncPhysicsRoutePanel as renderPhysicsRoutePanel,
} from './app/physics-sandbox-session';
import { cloneBoardDefinition } from './boards/board-codec';
import { analyzeBoard } from './editor/table-analysis';
import {
  buildAppRoutePath,
  getAppRouteFromPathname,
} from './app/routes';
import {
  addBumper,
  addCurvedGuide,
  addDropTarget,
  addFlipper,
  addGuide,
  addLowerPlayfield,
  addPost,
  addRollover,
  addSaucer,
  addSlingshot,
  addSpinner,
  addStandupTarget,
  deleteSelection,
  hitTestGuideHandle,
  hitTestOrientedRotateHandle,
  hitTestSelection,
  moveGuideHandle,
  moveSelection,
  rotateSelection,
  updateSelectedGuidePlane,
  updateSelectedNumericField,
} from './editor/table-editor';
import type {
  EditorDragMode,
  EditorSelection,
  EditorTool,
} from './editor/editor-types';
import {
  deleteCustomTable,
  exportBoardDefinition,
  loadTablesState,
  resetBuiltInTable,
  setActiveTableId,
  upsertTable,
} from './editor/table-storage';
import { snapPointToGrid } from './editor/grid';
import { GameAudio } from './audio/game-audio';
import { GameLoop } from './game/game-loop';
import type { PhysicsSandboxLoop } from './game/physics-sandbox-loop';
import { createInitialGameState } from './game/game-state';
import { validateRulesScript } from './game/rules-engine';
import { PlayInput, type InputSource } from './input/keyboard-input';
import { BOARD_THEMES } from './render/board-themes';
import { CanvasRenderer } from './render/canvas-renderer';
import type { BoardDefinition, Point } from './types/board-definition';
import { isArcGuide } from './game/guide-geometry';
import './styles.css';

type AppMode = 'edit' | 'play' | 'rules' | 'physics';
type DebugDestination = 'board-editor' | 'play-test';

const DEBUG_HASHES: Record<DebugDestination, string> = {
  'board-editor': '#debug-board-editor',
  'play-test': '#debug-play-test',
};

interface AppState {
  tables: TableRecord[];
  activeTableId: string;
  mode: AppMode;
  navMenuOpen: boolean;
  tool: EditorTool;
  selection: EditorSelection;
  dragging: boolean;
  dragMode: EditorDragMode | null;
  dragOffset: Point | null;
  draftPosition: Point | null;
  snapToGrid: boolean;
  analysisRequested: boolean;
  loop: GameLoop | null;
  sandboxLoop: PhysicsSandboxLoop | null;
  input: InputSource | null;
}

const queryRequired = <T extends Element>(selector: string): T => {
  const element = document.querySelector<T>(selector);

  if (!element) {
    throw new Error(`Expected ${selector} to exist.`);
  }

  return element;
};

const canvas = queryRequired<HTMLCanvasElement>('#game');
const panelTitle = queryRequired<HTMLElement>('#panel-title');
const panelCopy = queryRequired<HTMLElement>('#panel-copy');
const tableSelect = queryRequired<HTMLSelectElement>('#table-select');
const newTableButton = queryRequired<HTMLButtonElement>('#new-table');
const duplicateTableButton =
  queryRequired<HTMLButtonElement>('#duplicate-table');
const playToggleButton = queryRequired<HTMLButtonElement>('#play-toggle');
const removeTableButton = queryRequired<HTMLButtonElement>('#remove-table');
const tableNameInput = queryRequired<HTMLInputElement>('#table-name');
const tableThemeSelect = queryRequired<HTMLSelectElement>('#table-theme');
const tableMeta = queryRequired<HTMLElement>('#table-meta');
const selectionLabel = queryRequired<HTMLElement>('#selection-label');
const selectionFields = queryRequired<HTMLElement>('#selection-fields');
const deleteSelectionButton =
  queryRequired<HTMLButtonElement>('#delete-selection');
const snapToGridToggle = queryRequired<HTMLInputElement>('#snap-to-grid');
const tableExportPanel = queryRequired<HTMLDetailsElement>(
  '#table-export-panel',
);
const tableExportJson =
  queryRequired<HTMLTextAreaElement>('#table-export-json');
const copyTableJsonButton =
  queryRequired<HTMLButtonElement>('#copy-table-json');
const analyzeTableButton =
  queryRequired<HTMLButtonElement>('#analyze-table');
const analysisStatus = queryRequired<HTMLElement>('#analysis-status');
const analysisWarnings = queryRequired<HTMLElement>('#analysis-warnings');
const rulesScriptStatus = queryRequired<HTMLElement>('#rules-script-status');
const rulesScriptEditor = queryRequired<HTMLTextAreaElement>(
  '#rules-script-editor',
);
const copyRulesScriptButton =
  queryRequired<HTMLButtonElement>('#copy-rules-script');
const modeTitle = queryRequired<HTMLElement>('#mode-title');
const modeCopy = queryRequired<HTMLElement>('#mode-copy');
const navToggleButton = queryRequired<HTMLButtonElement>('#nav-toggle');
const playTableSelect = queryRequired<HTMLSelectElement>('#play-table-select');
const playTableMeta = queryRequired<HTMLElement>('#play-table-meta');
const playResetBallButton =
  queryRequired<HTMLButtonElement>('#play-reset-ball');
const playDebugStatus = queryRequired<HTMLElement>('#play-debug-status');
const playDebugPosition = queryRequired<HTMLElement>('#play-debug-position');
const playDebugVelocity = queryRequired<HTMLElement>('#play-debug-velocity');
const playDebugSpin = queryRequired<HTMLElement>('#play-debug-spin');
const physicsSpawnMode =
  queryRequired<HTMLSelectElement>('#physics-spawn-mode');
const physicsVxInput = queryRequired<HTMLInputElement>('#physics-vx');
const physicsVyInput = queryRequired<HTMLInputElement>('#physics-vy');
const physicsWxInput = queryRequired<HTMLInputElement>('#physics-wx');
const physicsWyInput = queryRequired<HTMLInputElement>('#physics-wy');
const physicsPauseToggle =
  queryRequired<HTMLButtonElement>('#physics-pause-toggle');
const physicsClearBallsButton =
  queryRequired<HTMLButtonElement>('#physics-clear-balls');
const physicsResetButton =
  queryRequired<HTMLButtonElement>('#physics-reset');
const physicsStatus = queryRequired<HTMLElement>('#physics-status');
const physicsDebugStatus =
  queryRequired<HTMLElement>('#physics-debug-status');
const physicsDebugPosition =
  queryRequired<HTMLElement>('#physics-debug-position');
const physicsDebugVelocity =
  queryRequired<HTMLElement>('#physics-debug-velocity');
const physicsDebugSpin = queryRequired<HTMLElement>('#physics-debug-spin');
const debugLinkEditor = queryRequired<HTMLAnchorElement>('#debug-link-editor');
const debugLinkPlay = queryRequired<HTMLAnchorElement>('#debug-link-play');
const debugLinkPhysics =
  queryRequired<HTMLAnchorElement>('#debug-link-physics');
const debugLinkRules = queryRequired<HTMLAnchorElement>('#debug-link-rules');

const renderer = new CanvasRenderer(canvas);
const gameAudio = new GameAudio();
const loadedState = loadTablesState();
const appBasePath = import.meta.env.BASE_URL;
const appRoute = getAppRouteFromPathname(window.location.pathname, appBasePath);

const state: AppState = {
  tables: loadedState.tables,
  activeTableId: loadedState.activeTableId,
  mode:
    appRoute === 'editor'
      ? 'edit'
      : appRoute === 'rules'
        ? 'rules'
        : appRoute === 'physics'
          ? 'physics'
          : 'play',
  navMenuOpen: false,
  tool: 'select',
  selection: { kind: 'none' },
  dragging: false,
  dragMode: null,
  dragOffset: null,
  draftPosition: null,
  snapToGrid: true,
  analysisRequested: false,
  loop: null,
  sandboxLoop: null,
  input: null,
};

document.body.dataset.route = appRoute;
document.body.dataset.navOpen = 'false';

if (BUILT_IN_TABLES.length === 0) {
  throw new Error('Expected at least one built-in table.');
}

if (appRoute === 'editor') {
  bootEditorRoute();
} else if (appRoute === 'rules') {
  bootRulesRoute();
} else if (appRoute === 'physics') {
  bootPhysicsRoute();
} else {
  bootPlayRoute();
}

navToggleButton.addEventListener('click', () => {
  setNavMenuOpen(!state.navMenuOpen);
});

[debugLinkEditor, debugLinkPlay, debugLinkPhysics, debugLinkRules].forEach(
  (link) => {
    link.addEventListener('click', () => {
      if (window.matchMedia('(max-width: 1080px)').matches) {
        setNavMenuOpen(false);
      }
    });
  },
);

function bootEditorRoute(): void {
  panelTitle.textContent = 'Table editor';
  panelCopy.textContent =
    'Add, drag, delete, and play-test tables. All edits persist in local storage.';
  debugLinkEditor.href = DEBUG_HASHES['board-editor'];
  debugLinkEditor.textContent = 'Board editor';
  debugLinkPlay.href = DEBUG_HASHES['play-test'];
  debugLinkPlay.textContent = 'Play test';
  debugLinkPhysics.href = buildAppRoutePath('physics', appBasePath);
  debugLinkPhysics.textContent = 'Physics';
  debugLinkRules.href = buildAppRoutePath('rules', appBasePath);
  debugLinkRules.textContent = 'Rules';

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

  tableThemeSelect.addEventListener('change', () => {
    replaceActiveBoard(
      {
        ...getActiveTable().board,
        themeId: tableThemeSelect.value as BoardDefinition['themeId'],
      },
      true,
    );
    renderApp();
  });

  snapToGridToggle.addEventListener('change', () => {
    state.snapToGrid = snapToGridToggle.checked;
    renderApp();
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

    const normalizedValue =
      field === 'angle' ||
      field === 'ejectAngle' ||
      field === 'startAngle' ||
      field === 'endAngle'
        ? (value * Math.PI) / 180
        : value;

    replaceActiveBoard(
      updateSelectedNumericField(
        getActiveTable().board,
        state.selection,
        field,
        normalizedValue,
      ),
      true,
    );
    renderApp();
  });

  selectionFields.addEventListener('change', (event) => {
    const target = event.target;

    if (!(target instanceof HTMLSelectElement)) {
      return;
    }

    const field = target.dataset.field;

    if (field !== 'plane' || state.selection.kind !== 'guide') {
      return;
    }

    replaceActiveBoard(
      updateSelectedGuidePlane(
        getActiveTable().board,
        state.selection,
        target.value === 'raised' ? 'raised' : 'playfield',
      ),
      true,
    );
    renderApp();
  });

  deleteSelectionButton.addEventListener('click', () => {
    removeCurrentSelection();
  });

  copyTableJsonButton.addEventListener('click', async () => {
    const json = tableExportJson.value;

    try {
      await navigator.clipboard.writeText(json);
      copyTableJsonButton.textContent = 'Copied';
      window.setTimeout(() => {
        copyTableJsonButton.textContent = 'Copy JSON';
      }, 1200);
    } catch {
      tableExportPanel.open = true;
      tableExportJson.focus();
      tableExportJson.select();
    }
  });

  analyzeTableButton.addEventListener('click', () => {
    state.analysisRequested = true;
    renderApp();
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
      const result = addBumper(getActiveTable().board, getSnappedEditorPoint(point));

      state.selection = result.selection;
      state.tool = 'select';
      state.dragging = true;
      state.dragMode = 'move-selection';
      state.dragOffset = { x: 0, y: 0 };
      state.draftPosition = null;
      replaceActiveBoard(result.board, false);
      renderApp();
      return;
    }

    if (state.tool === 'add-post') {
      const result = addPost(getActiveTable().board, getSnappedEditorPoint(point));

      state.selection = result.selection;
      state.tool = 'select';
      state.dragging = true;
      state.dragMode = 'move-selection';
      state.dragOffset = { x: 0, y: 0 };
      state.draftPosition = null;
      replaceActiveBoard(result.board, false);
      renderApp();
      return;
    }

    if (state.tool === 'add-guide') {
      const result = addGuide(getActiveTable().board, getSnappedEditorPoint(point));

      state.selection = result.selection;
      state.tool = 'select';
      state.dragging = true;
      state.dragMode = 'move-selection';
      state.dragOffset = { x: 0, y: 0 };
      state.draftPosition = null;
      replaceActiveBoard(result.board, false);
      renderApp();
      return;
    }

    if (state.tool === 'add-curved-guide') {
      const result = addCurvedGuide(
        getActiveTable().board,
        getSnappedEditorPoint(point),
      );

      state.selection = result.selection;
      state.tool = 'select';
      state.dragging = true;
      state.dragMode = 'move-selection';
      state.dragOffset = { x: 0, y: 0 };
      state.draftPosition = null;
      replaceActiveBoard(result.board, false);
      renderApp();
      return;
    }

    if (state.tool === 'add-standup-target') {
      const result = addStandupTarget(
        getActiveTable().board,
        getSnappedEditorPoint(point),
      );

      state.selection = result.selection;
      state.tool = 'select';
      state.dragging = true;
      state.dragMode = 'move-selection';
      state.dragOffset = { x: 0, y: 0 };
      state.draftPosition = null;
      replaceActiveBoard(result.board, false);
      renderApp();
      return;
    }

    if (state.tool === 'add-drop-target') {
      const result = addDropTarget(
        getActiveTable().board,
        getSnappedEditorPoint(point),
      );

      state.selection = result.selection;
      state.tool = 'select';
      state.dragging = true;
      state.dragMode = 'move-selection';
      state.dragOffset = { x: 0, y: 0 };
      state.draftPosition = null;
      replaceActiveBoard(result.board, false);
      renderApp();
      return;
    }

    if (state.tool === 'add-saucer') {
      const result = addSaucer(getActiveTable().board, getSnappedEditorPoint(point));

      state.selection = result.selection;
      state.tool = 'select';
      state.dragging = true;
      state.dragMode = 'move-selection';
      state.dragOffset = { x: 0, y: 0 };
      state.draftPosition = null;
      replaceActiveBoard(result.board, false);
      renderApp();
      return;
    }

    if (state.tool === 'add-spinner') {
      const result = addSpinner(getActiveTable().board, getSnappedEditorPoint(point));

      state.selection = result.selection;
      state.tool = 'select';
      state.dragging = true;
      state.dragMode = 'move-selection';
      state.dragOffset = { x: 0, y: 0 };
      state.draftPosition = null;
      replaceActiveBoard(result.board, false);
      renderApp();
      return;
    }

    if (state.tool === 'add-slingshot') {
      const result = addSlingshot(
        getActiveTable().board,
        getSnappedEditorPoint(point),
      );

      state.selection = result.selection;
      state.tool = 'select';
      state.dragging = true;
      state.dragMode = 'move-selection';
      state.dragOffset = { x: 0, y: 0 };
      state.draftPosition = null;
      replaceActiveBoard(result.board, false);
      renderApp();
      return;
    }

    if (state.tool === 'add-lower-playfield') {
      const result = addLowerPlayfield(
        getActiveTable().board,
        getSnappedEditorPoint(point),
      );

      state.selection = result.selection;
      state.tool = 'select';
      state.dragging = false;
      state.dragMode = null;
      state.dragOffset = null;
      state.draftPosition = null;
      replaceActiveBoard(result.board, false);
      renderApp();
      return;
    }

    if (state.tool === 'add-rollover') {
      const result = addRollover(
        getActiveTable().board,
        getSnappedEditorPoint(point),
      );

      state.selection = result.selection;
      state.tool = 'select';
      state.dragging = true;
      state.dragMode = 'move-selection';
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
        getSnappedEditorPoint(point),
      );

      state.selection = result.selection;
      state.tool = 'select';
      state.dragging = true;
      state.dragMode = 'move-selection';
      state.dragOffset = { x: 0, y: 0 };
      state.draftPosition = null;
      replaceActiveBoard(result.board, false);
      renderApp();
      return;
    }

    const activeBoard = getActiveTable().board;

    if (
      state.selection.kind === 'guide' &&
      state.selection.index !== undefined
    ) {
      const guide = activeBoard.guides[state.selection.index];
      const guideHandle = guide ? hitTestGuideHandle(point, guide) : null;

      if (guideHandle) {
        state.dragging = true;
        state.dragMode =
          guideHandle === 'start'
            ? 'guide-start'
            : guideHandle === 'end'
              ? 'guide-end'
              : guideHandle === 'arc-start'
                ? 'guide-arc-start'
                : guideHandle === 'arc-end'
                  ? 'guide-arc-end'
                  : guideHandle === 'arc-radius'
                    ? 'guide-arc-radius'
                    : 'guide-rotate';
        state.dragOffset = null;
        state.draftPosition = null;
        renderApp();
        return;
      }
    }

    if (
      state.selection.kind === 'standup-target' &&
      state.selection.index !== undefined
    ) {
      const target = activeBoard.standupTargets[state.selection.index];

      if (
        target &&
        hitTestOrientedRotateHandle(point, target, target.height, target.angle)
      ) {
        state.dragging = true;
        state.dragMode = 'oriented-rotate';
        state.dragOffset = null;
        state.draftPosition = null;
        renderApp();
        return;
      }
    }

    if (
      state.selection.kind === 'drop-target' &&
      state.selection.index !== undefined
    ) {
      const target = activeBoard.dropTargets[state.selection.index];

      if (
        target &&
        hitTestOrientedRotateHandle(point, target, target.height, target.angle)
      ) {
        state.dragging = true;
        state.dragMode = 'oriented-rotate';
        state.dragOffset = null;
        state.draftPosition = null;
        renderApp();
        return;
      }
    }

    if (
      state.selection.kind === 'spinner' &&
      state.selection.index !== undefined
    ) {
      const spinner = activeBoard.spinners[state.selection.index];

      if (
        spinner &&
        hitTestOrientedRotateHandle(
          point,
          spinner,
          spinner.thickness,
          spinner.angle,
        )
      ) {
        state.dragging = true;
        state.dragMode = 'oriented-rotate';
        state.dragOffset = null;
        state.draftPosition = null;
        renderApp();
        return;
      }
    }

    if (
      state.selection.kind === 'slingshot' &&
      state.selection.index !== undefined
    ) {
      const slingshot = activeBoard.slingshots[state.selection.index];

      if (
        slingshot &&
        hitTestOrientedRotateHandle(
          point,
          slingshot,
          slingshot.height,
          slingshot.angle,
        )
      ) {
        state.dragging = true;
        state.dragMode = 'oriented-rotate';
        state.dragOffset = null;
        state.draftPosition = null;
        renderApp();
        return;
      }
    }

    state.selection = hitTestSelection(activeBoard, point);
    state.dragging = state.selection.kind !== 'none';
    state.dragMode = state.dragging ? 'move-selection' : null;
    state.dragOffset = getDragOffset(activeBoard, state.selection, point);
    renderApp();
  });

  canvas.addEventListener('pointermove', (event) => {
    if (state.mode !== 'edit') {
      return;
    }

    const point = getBoardPoint(event);

    if (state.dragging && state.selection.kind !== 'none') {
      const board = getActiveTable().board;

      if (state.dragMode === 'guide-start') {
        replaceActiveBoard(
          moveGuideHandle(
            board,
            state.selection,
            'start',
            getSnappedEditorPoint(point),
          ),
          false,
        );
      } else if (state.dragMode === 'guide-end') {
        replaceActiveBoard(
          moveGuideHandle(
            board,
            state.selection,
            'end',
            getSnappedEditorPoint(point),
          ),
          false,
        );
      } else if (state.dragMode === 'guide-arc-start') {
        replaceActiveBoard(
          moveGuideHandle(board, state.selection, 'arc-start', point),
          false,
        );
      } else if (state.dragMode === 'guide-arc-end') {
        replaceActiveBoard(
          moveGuideHandle(board, state.selection, 'arc-end', point),
          false,
        );
      } else if (state.dragMode === 'guide-arc-radius') {
        replaceActiveBoard(
          moveGuideHandle(board, state.selection, 'arc-radius', point),
          false,
        );
      } else if (state.dragMode === 'guide-rotate') {
        replaceActiveBoard(
          moveGuideHandle(board, state.selection, 'rotate', point),
          false,
        );
      } else if (state.dragMode === 'oriented-rotate') {
        replaceActiveBoard(
          rotateSelection(board, state.selection, point),
          false,
        );
      } else {
        const dragOffset = state.dragOffset ?? { x: 0, y: 0 };
        const targetPoint = getSnappedEditorPoint({
          x: point.x - dragOffset.x,
          y: point.y - dragOffset.y,
        });

        replaceActiveBoard(
          moveSelection(board, state.selection, targetPoint),
          false,
        );
      }

      renderApp();
      return;
    }

    state.draftPosition =
      state.tool === 'select' ? null : getSnappedEditorPoint(point);
    renderApp();
  });

  canvas.addEventListener('pointerup', () => {
    if (!state.dragging) {
      return;
    }

    state.dragging = false;
    state.dragMode = null;
    state.dragOffset = null;
    persistTable(getActiveTable());
    renderApp();
  });

  canvas.addEventListener('pointercancel', () => {
    state.dragging = false;
    state.dragMode = null;
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
  state.mode = 'play';

  playTableSelect.addEventListener('change', () => {
    state.activeTableId = playTableSelect.value;
    setActiveTableId(state.activeTableId);
    syncPlayRoutePanel();
    restartStandalonePlay();
  });

  playResetBallButton.addEventListener('click', () => {
    state.loop?.resetBall();
  });

  syncPlayRoutePanel();
  restartStandalonePlay();

  modeCopy.textContent =
    'Keyboard and touch controls are both live. On touch, hold the lower left or right playfield to flip, swipe left/right/up to nudge, and swipe down on the right side to plunge.';
  debugLinkEditor.href = buildAppRoutePath('editor', appBasePath);
  debugLinkEditor.textContent = 'Open editor';
  debugLinkPlay.href = buildAppRoutePath('play', appBasePath);
  debugLinkPlay.textContent = 'Game';
  debugLinkPhysics.href = buildAppRoutePath('physics', appBasePath);
  debugLinkPhysics.textContent = 'Physics';
  debugLinkRules.href = buildAppRoutePath('rules', appBasePath);
  debugLinkRules.textContent = 'Rules';
  debugLinkEditor.classList.remove('is-active');
  debugLinkEditor.setAttribute('aria-current', 'false');
  debugLinkPlay.classList.add('is-active');
  debugLinkPlay.setAttribute('aria-current', 'page');
  debugLinkPhysics.classList.remove('is-active');
  debugLinkPhysics.setAttribute('aria-current', 'false');
  debugLinkRules.classList.remove('is-active');
  debugLinkRules.setAttribute('aria-current', 'false');
}

function bootPhysicsRoute(): void {
  state.mode = 'physics';

  playTableSelect.addEventListener('change', () => {
    state.activeTableId = playTableSelect.value;
    setActiveTableId(state.activeTableId);
    syncPhysicsRoutePanel();
    restartPhysicsSandbox();
  });

  physicsSpawnMode.addEventListener('change', () => {
    state.sandboxLoop?.setSpawnMode(
      physicsSpawnMode.value === 'add' ? 'add' : 'replace',
    );
  });

  physicsVxInput.addEventListener('input', () => {
    const value = Number(physicsVxInput.value);

    if (Number.isFinite(value)) {
      state.sandboxLoop?.setLinearVelocity('x', value);
    }
  });

  physicsVyInput.addEventListener('input', () => {
    const value = Number(physicsVyInput.value);

    if (Number.isFinite(value)) {
      state.sandboxLoop?.setLinearVelocity('y', value);
    }
  });

  physicsWxInput.addEventListener('input', () => {
    const value = Number(physicsWxInput.value);

    if (Number.isFinite(value)) {
      state.sandboxLoop?.setAngularVelocity('x', value);
    }
  });

  physicsWyInput.addEventListener('input', () => {
    const value = Number(physicsWyInput.value);

    if (Number.isFinite(value)) {
      state.sandboxLoop?.setAngularVelocity('y', value);
    }
  });

  physicsPauseToggle.addEventListener('click', () => {
    state.sandboxLoop?.togglePaused();
  });

  physicsClearBallsButton.addEventListener('click', () => {
    state.sandboxLoop?.clearBalls();
  });

  physicsResetButton.addEventListener('click', () => {
    state.sandboxLoop?.reset();
    syncPhysicsSandboxInputs();
  });

  canvas.addEventListener('pointerdown', onPhysicsCanvasPointerDown);

  syncPhysicsRoutePanel();
  restartPhysicsSandbox();

  modeCopy.textContent =
    'Click anywhere valid on the playfield to inject a ball. Use the side panel to set initial linear and roll-spin vectors. Flippers and nudges still work, but gameplay rules and ball-count lifecycle are disabled.';
  debugLinkEditor.href = buildAppRoutePath('editor', appBasePath);
  debugLinkEditor.textContent = 'Open editor';
  debugLinkPlay.href = buildAppRoutePath('play', appBasePath);
  debugLinkPlay.textContent = 'Game';
  debugLinkPhysics.href = buildAppRoutePath('physics', appBasePath);
  debugLinkPhysics.textContent = 'Physics';
  debugLinkRules.href = buildAppRoutePath('rules', appBasePath);
  debugLinkRules.textContent = 'Rules';
  debugLinkEditor.classList.remove('is-active');
  debugLinkEditor.setAttribute('aria-current', 'false');
  debugLinkPlay.classList.remove('is-active');
  debugLinkPlay.setAttribute('aria-current', 'false');
  debugLinkPhysics.classList.add('is-active');
  debugLinkPhysics.setAttribute('aria-current', 'page');
  debugLinkRules.classList.remove('is-active');
  debugLinkRules.setAttribute('aria-current', 'false');
}

function bootRulesRoute(): void {
  state.mode = 'rules';
  state.selection = { kind: 'none' };
  state.tool = 'select';
  state.draftPosition = null;

  panelTitle.textContent = 'Rules editor';
  panelCopy.textContent =
    'Edit scriptable table rules in a separate workspace from the layout builder.';

  tableSelect.addEventListener('change', () => {
    state.activeTableId = tableSelect.value;
    state.selection = { kind: 'none' };
    setActiveTableId(state.activeTableId);
    renderApp();
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
    renderApp();
  });

  tableThemeSelect.addEventListener('change', () => {
    replaceActiveBoard(
      {
        ...getActiveTable().board,
        themeId: tableThemeSelect.value as BoardDefinition['themeId'],
      },
      true,
    );
    renderApp();
  });

  rulesScriptEditor.addEventListener('input', () => {
    replaceActiveBoard(
      {
        ...getActiveTable().board,
        rulesScript: rulesScriptEditor.value,
      },
      true,
    );
    syncRulesPanel();
  });

  copyRulesScriptButton.addEventListener('click', async () => {
    const script = rulesScriptEditor.value;

    try {
      await navigator.clipboard.writeText(script);
      copyRulesScriptButton.textContent = 'Copied';
      window.setTimeout(() => {
        copyRulesScriptButton.textContent = 'Copy Script';
      }, 1200);
    } catch {
      rulesScriptEditor.focus();
      rulesScriptEditor.select();
    }
  });

  debugLinkEditor.href = buildAppRoutePath('editor', appBasePath);
  debugLinkEditor.textContent = 'Board editor';
  debugLinkPlay.href = buildAppRoutePath('play', appBasePath);
  debugLinkPlay.textContent = 'Game';
  debugLinkPhysics.href = buildAppRoutePath('physics', appBasePath);
  debugLinkPhysics.textContent = 'Physics';
  debugLinkRules.href = buildAppRoutePath('rules', appBasePath);
  debugLinkRules.textContent = 'Rules';

  renderApp();
}

function renderApp(): void {
  syncTableList();
  syncToolButtons();
  syncGridControls();
  syncTablePanel();
  syncSelectionPanel();
  syncExportPanel();
  syncAnalysisPanel();
  syncRulesPanel();
  syncModeCopy();
  syncDebugMenu();

  if (state.mode === 'edit' || state.mode === 'rules') {
    renderer.renderEditor(
      getActiveTable().board,
      state.mode === 'edit' ? state.selection : { kind: 'none' },
      state.mode === 'edit' && state.tool !== 'select'
        ? state.draftPosition
        : null,
      {
        showGrid: state.mode === 'edit',
        snapToGrid: state.snapToGrid,
      },
    );
  }
}

function syncExportPanel(): void {
  if (state.mode !== 'edit') {
    return;
  }

  const exported = exportBoardDefinition(getActiveTable().board);
  tableExportJson.value = `${JSON.stringify(exported, null, 2)}\n`;
}

function syncRulesPanel(): void {
  if (state.mode !== 'rules') {
    return;
  }

  const { board } = getActiveTable();
  const validationError = validateRulesScript(board.rulesScript);

  if (document.activeElement !== rulesScriptEditor) {
    rulesScriptEditor.value = board.rulesScript;
  }

  rulesScriptStatus.textContent = validationError
    ? `Rules have a compile error. Game falls back to the default rules until this is fixed: ${validationError}`
    : 'Rules script compiled successfully.';
}

function syncAnalysisPanel(): void {
  if (state.mode !== 'edit') {
    return;
  }

  analyzeTableButton.textContent = state.analysisRequested
    ? 'Re-run analysis'
    : 'Analyze table';

  if (!state.analysisRequested) {
    analysisStatus.textContent =
      'Run analysis to find potentially problematic geometry.';
    analysisWarnings.replaceChildren();
    return;
  }

  const warnings = analyzeBoard(getActiveTable().board);
  analysisStatus.textContent =
    warnings.length === 0
      ? 'No overlap warnings detected.'
      : `${warnings.length} warning${warnings.length === 1 ? '' : 's'} found.`;

  analysisWarnings.replaceChildren(
    ...warnings.map((warning) => {
      const item = document.createElement('article');
      item.className = 'analysis-warning';

      const title = document.createElement('p');
      title.className = 'analysis-warning-title';
      title.textContent = warning.title;

      const message = document.createElement('p');
      message.className = 'analysis-warning-message';
      message.textContent = warning.message;

      item.append(title, message);
      return item;
    }),
  );
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

function syncGridControls(): void {
  snapToGridToggle.checked = state.snapToGrid;
}

function syncTablePanel(): void {
  const active = getActiveTable();

  tableNameInput.value = active.board.name;
  tableThemeSelect.replaceChildren(
    ...Object.values(BOARD_THEMES).map((theme) => {
      const option = document.createElement('option');
      option.value = theme.id;
      option.selected = theme.id === active.board.themeId;
      option.textContent = theme.label;
      return option;
    }),
  );
  tableMeta.textContent = `${active.builtIn ? 'Built-in table' : 'Custom table'} · ${getFeatureCount(active.board)} features`;
  removeTableButton.textContent = active.builtIn ? 'Reset built-in' : 'Delete';
}

function syncSelectionPanel(): void {
  renderSelectionPanel({
    board: getActiveTable().board,
    selection: state.selection,
    selectionLabel,
    selectionFields,
    deleteSelectionButton,
  });
}

function syncModeCopy(): void {
  if (state.mode === 'play') {
    modeTitle.textContent = 'Playing current table';
    modeCopy.textContent =
      'Use Arrow Up to pull and release the plunger, Left Shift / Left Arrow plus Right Shift / Right Arrow to flip, and Z, /, or Space to nudge. On touch, hold the lower left or right playfield to flip, swipe left/right/up to nudge, and swipe down on the right side to plunge. Press Play Test again or Escape to return to editing.';
    playToggleButton.textContent = 'Back to editor';
    playToggleButton.classList.add('accent-button');
    return;
  }

  if (state.mode === 'physics') {
    modeTitle.textContent = 'Physics sandbox';
    modeCopy.textContent =
      'Inject balls with explicit initial vectors to test raw physics against the current table. Rules, scoring, and ball progression are bypassed on this route.';
    return;
  }

  if (state.mode === 'rules') {
    modeTitle.textContent = 'Editing rules';
    modeCopy.textContent =
      'Use this route to edit game logic separately from the table layout.';
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
  const playActive = state.mode === 'play';
  const physicsActive = state.mode === 'physics';
  const rulesActive = state.mode === 'rules';

  debugLinkEditor.classList.toggle('is-active', editorActive);
  debugLinkEditor.setAttribute('aria-current', editorActive ? 'page' : 'false');
  debugLinkPlay.classList.toggle('is-active', playActive);
  debugLinkPlay.setAttribute('aria-current', playActive ? 'page' : 'false');
  debugLinkPhysics.classList.toggle('is-active', physicsActive);
  debugLinkPhysics.setAttribute(
    'aria-current',
    physicsActive ? 'page' : 'false',
  );
  debugLinkRules.classList.toggle('is-active', rulesActive);
  debugLinkRules.setAttribute('aria-current', rulesActive ? 'page' : 'false');
  navToggleButton.setAttribute('aria-expanded', state.navMenuOpen ? 'true' : 'false');
  navToggleButton.setAttribute(
    'aria-label',
    state.navMenuOpen ? 'Close navigation menu' : 'Open navigation menu',
  );
}

function setNavMenuOpen(open: boolean): void {
  state.navMenuOpen = open;
  document.body.dataset.navOpen = open ? 'true' : 'false';
  navToggleButton.setAttribute('aria-expanded', open ? 'true' : 'false');
  navToggleButton.setAttribute(
    'aria-label',
    open ? 'Close navigation menu' : 'Open navigation menu',
  );
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
  const input = new PlayInput(canvas);
  const loop = new GameLoop(
    createInitialGameState(board),
    board,
    input,
    renderer,
    gameAudio,
  );

  state.mode = 'play';
  state.selection = { kind: 'none' };
  state.tool = 'select';
  state.draftPosition = null;
  state.dragging = false;
  state.dragMode = null;
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

function getSnappedEditorPoint(point: Point): Point {
  if (state.mode !== 'edit' || !state.snapToGrid) {
    return point;
  }

  return snapPointToGrid(point);
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

  if (selection.kind === 'post' && selection.index !== undefined) {
    const post = board.posts[selection.index];

    if (!post) {
      return null;
    }

    return {
      x: point.x - post.x,
      y: point.y - post.y,
    };
  }

  if (selection.kind === 'guide' && selection.index !== undefined) {
    const guide = board.guides[selection.index];

    if (!guide) {
      return null;
    }

    return isArcGuide(guide)
      ? {
          x: point.x - guide.center.x,
          y: point.y - guide.center.y,
        }
      : {
          x: point.x - guide.start.x,
          y: point.y - guide.start.y,
        };
  }

  if (selection.kind === 'standup-target' && selection.index !== undefined) {
    const target = board.standupTargets[selection.index];

    if (!target) {
      return null;
    }

    return {
      x: point.x - target.x,
      y: point.y - target.y,
    };
  }

  if (selection.kind === 'drop-target' && selection.index !== undefined) {
    const target = board.dropTargets[selection.index];

    if (!target) {
      return null;
    }

    return {
      x: point.x - target.x,
      y: point.y - target.y,
    };
  }

  if (selection.kind === 'saucer' && selection.index !== undefined) {
    const saucer = board.saucers[selection.index];

    if (!saucer) {
      return null;
    }

    return {
      x: point.x - saucer.x,
      y: point.y - saucer.y,
    };
  }

  if (selection.kind === 'spinner' && selection.index !== undefined) {
    const spinner = board.spinners[selection.index];

    if (!spinner) {
      return null;
    }

    return {
      x: point.x - spinner.x,
      y: point.y - spinner.y,
    };
  }

  if (selection.kind === 'slingshot' && selection.index !== undefined) {
    const slingshot = board.slingshots[selection.index];

    if (!slingshot) {
      return null;
    }

    return {
      x: point.x - slingshot.x,
      y: point.y - slingshot.y,
    };
  }

  if (selection.kind === 'rollover' && selection.index !== undefined) {
    const rollover = board.rollovers[selection.index];

    if (!rollover) {
      return null;
    }

    return {
      x: point.x - rollover.x,
      y: point.y - rollover.y,
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

function restartStandalonePlay(): void {
  state.sandboxLoop?.stop();
  state.sandboxLoop = null;
  state.loop?.stop();

  const session = startStandalonePlaySession({
    activeTable: getActiveTable(),
    canvas,
    renderer,
    gameAudio,
    modeTitle,
    playDebugStatus,
    playDebugPosition,
    playDebugVelocity,
    playDebugSpin,
  });

  state.input = session.input;
  state.loop = session.loop;
}

function syncPlayRoutePanel(): void {
  renderPlayRoutePanel({
    tables: state.tables,
    activeTableId: state.activeTableId,
    playTableSelect,
    playTableMeta,
    getFeatureCount,
  });
}

function restartPhysicsSandbox(): void {
  state.loop?.stop();
  state.loop = null;
  state.sandboxLoop?.stop();

  const session = startPhysicsSandboxSession({
    activeTable: getActiveTable(),
    canvas,
    renderer,
    modeTitle,
    statusMessage: physicsStatus,
    pauseButton: physicsPauseToggle,
    debugStatus: physicsDebugStatus,
    debugPosition: physicsDebugPosition,
    debugVelocity: physicsDebugVelocity,
    debugSpin: physicsDebugSpin,
  });

  state.input = session.input;
  state.sandboxLoop = session.loop;
  syncPhysicsSandboxInputs();
}

function syncPhysicsRoutePanel(): void {
  renderPhysicsRoutePanel({
    tables: state.tables,
    activeTableId: state.activeTableId,
    tableSelect: playTableSelect,
    tableMeta: playTableMeta,
    getFeatureCount,
  });
}

function syncPhysicsSandboxInputs(): void {
  const sandboxState = state.sandboxLoop?.getState();

  if (!sandboxState) {
    return;
  }

  physicsSpawnMode.value = sandboxState.spawnMode;
  physicsVxInput.value = `${sandboxState.spawnLinearVelocity.x}`;
  physicsVyInput.value = `${sandboxState.spawnLinearVelocity.y}`;
  physicsWxInput.value = `${sandboxState.spawnAngularVelocity.x}`;
  physicsWyInput.value = `${sandboxState.spawnAngularVelocity.y}`;
  physicsPauseToggle.textContent = sandboxState.paused ? 'Resume' : 'Pause';
}

function onPhysicsCanvasPointerDown(event: PointerEvent): void {
  if (state.mode !== 'physics') {
    return;
  }

  if (event.pointerType === 'touch') {
    return;
  }

  const sandboxLoop = state.sandboxLoop;

  if (!sandboxLoop) {
    return;
  }

  const tableOffset = sandboxLoop.getCurrentTableOffset();
  const point = getBoardPoint(event);

  sandboxLoop.spawnBall({
    x: point.x - tableOffset.x,
    y: point.y - tableOffset.y,
  });
}

function getFeatureCount(board: BoardDefinition): number {
  return (
    board.posts.length +
    board.bumpers.length +
    board.standupTargets.length +
    board.dropTargets.length +
    board.saucers.length +
    board.spinners.length +
    board.slingshots.length +
    board.rollovers.length +
    board.guides.length +
    board.flippers.length
  );
}
