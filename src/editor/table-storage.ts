import {
  BUILT_IN_TABLES,
  cloneBoardDefinition,
  normalizeBoardDefinition,
  type TableRecord,
} from '../boards/table-library';
import { cloneGuide } from '../game/guide-geometry';
import { physicsDefaults } from '../game/physics-defaults';
import type {
  BoardDefinition,
  BoardDefinitionInput,
  SurfaceMaterial,
  SurfaceMaterialName,
} from '../types/board-definition';

const STORAGE_KEY = 'pball-web.tables.v2';
const LEGACY_STORAGE_KEY = 'pball-web.tables.v1';

interface StoredTableRecord {
  id: string;
  board: unknown;
  builtIn: boolean;
}

interface StoredTablesState {
  activeTableId: string | null;
  tables: StoredTableRecord[];
}

export interface LoadedTablesState {
  activeTableId: string;
  tables: TableRecord[];
}

const DEFAULT_ACTIVE_TABLE_ID = BUILT_IN_TABLES[0]?.id ?? '';

export const loadTablesState = (
  storage: Storage = window.localStorage,
): LoadedTablesState => {
  const stored = parseStorageState(storage);
  const storedMap = new Map<string, TableRecord>();

  for (const entry of stored.tables) {
    if (!isStoredTableRecord(entry)) {
      continue;
    }

    storedMap.set(entry.id, {
      id: entry.id,
      builtIn: entry.builtIn,
      board: normalizeBoardDefinition(entry.board as never),
    });
  }

  const tables = BUILT_IN_TABLES.map(
    (table) => storedMap.get(table.id) ?? table,
  ).map((table) => ({
    ...table,
    board: cloneBoardDefinition(table.board),
  }));

  for (const table of storedMap.values()) {
    if (
      table.builtIn ||
      BUILT_IN_TABLES.some((builtIn) => builtIn.id === table.id)
    ) {
      continue;
    }

    tables.push({
      ...table,
      board: cloneBoardDefinition(table.board),
    });
  }

  tables.sort((left, right) =>
    left.board.name.localeCompare(right.board.name, undefined, {
      sensitivity: 'base',
    }),
  );

  const activeTableId =
    tables.find((table) => table.id === stored.activeTableId)?.id ??
    tables[0]?.id ??
    DEFAULT_ACTIVE_TABLE_ID;

  return {
    activeTableId,
    tables,
  };
};

export const upsertTable = (
  table: TableRecord,
  storage: Storage = window.localStorage,
): void => {
  const state = parseStorageState(storage);
  const nextTables = state.tables.filter((entry) => entry.id !== table.id);

  nextTables.push({
    id: table.id,
    builtIn: table.builtIn,
    board: exportBoardDefinition(table.board),
  });

  writeStorageState(
    {
      activeTableId: table.id,
      tables: nextTables,
    },
    storage,
  );
};

export const deleteCustomTable = (
  tableId: string,
  storage: Storage = window.localStorage,
): void => {
  const state = parseStorageState(storage);

  writeStorageState(
    {
      activeTableId:
        state.activeTableId === tableId
          ? DEFAULT_ACTIVE_TABLE_ID
          : state.activeTableId,
      tables: state.tables.filter(
        (entry) => !(entry.id === tableId && entry.builtIn === false),
      ),
    },
    storage,
  );
};

export const resetBuiltInTable = (
  tableId: string,
  storage: Storage = window.localStorage,
): void => {
  const state = parseStorageState(storage);

  writeStorageState(
    {
      activeTableId: tableId,
      tables: state.tables.filter(
        (entry) => !(entry.id === tableId && entry.builtIn === true),
      ),
    },
    storage,
  );
};

export const setActiveTableId = (
  tableId: string,
  storage: Storage = window.localStorage,
): void => {
  const state = parseStorageState(storage);

  writeStorageState(
    {
      ...state,
      activeTableId: tableId,
    },
    storage,
  );
};

const parseStorageState = (storage: Storage): StoredTablesState => {
  const raw = storage.getItem(STORAGE_KEY);

  if (!raw) {
    return parseLegacyStorageState(storage);
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredTablesState>;

    return {
      activeTableId:
        typeof parsed.activeTableId === 'string' ? parsed.activeTableId : null,
      tables: Array.isArray(parsed.tables) ? parsed.tables : [],
    };
  } catch {
    return parseLegacyStorageState(storage);
  }
};

const writeStorageState = (
  state: StoredTablesState,
  storage: Storage,
): void => {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
  storage.removeItem(LEGACY_STORAGE_KEY);
};

const isStoredTableRecord = (value: unknown): value is StoredTableRecord => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<StoredTableRecord>;

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.builtIn === 'boolean' &&
    candidate.board !== undefined
  );
};

const parseLegacyStorageState = (storage: Storage): StoredTablesState => {
  const raw = storage.getItem(LEGACY_STORAGE_KEY);

  if (!raw) {
    return {
      activeTableId: null,
      tables: [],
    };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredTablesState>;

    return {
      activeTableId:
        typeof parsed.activeTableId === 'string' ? parsed.activeTableId : null,
      tables: Array.isArray(parsed.tables)
        ? parsed.tables.map((entry) =>
            isStoredTableRecord(entry)
              ? {
                  ...entry,
                  board: stripLegacyResolvedDefaults(entry.board),
                }
              : entry,
          )
        : [],
    };
  } catch {
    return {
      activeTableId: null,
      tables: [],
    };
  }
};

const stripLegacyResolvedDefaults = (board: unknown): unknown => {
  if (!board || typeof board !== 'object') {
    return board;
  }

  const candidate = { ...(board as Record<string, unknown>) };
  delete candidate.physics;
  delete candidate.surfaceMaterials;

  return candidate;
};

export const exportBoardDefinition = (
  board: BoardDefinition,
): BoardDefinitionInput => {
  const stored: BoardDefinitionInput = {
    name: board.name,
    width: board.width,
    height: board.height,
    drainY: board.drainY,
    launchPosition: { ...board.launchPosition },
    plunger: { ...board.plunger },
    materials: { ...board.materials },
    bumpers: board.bumpers.map((bumper) => ({ ...bumper })),
    standupTargets: board.standupTargets.map((target) => ({ ...target })),
    dropTargets: board.dropTargets.map((target) => ({ ...target })),
    saucers: board.saucers.map((saucer) => ({ ...saucer })),
    spinners: board.spinners.map((spinner) => ({ ...spinner })),
    rollovers: board.rollovers.map((rollover) => ({ ...rollover })),
    guides: board.guides.map(cloneGuide),
    flippers: board.flippers.map((flipper) => ({ ...flipper })),
  };

  if (board.gravity !== physicsDefaults.gravity) {
    stored.gravity = board.gravity;
  }

  if (board.tableAngle !== physicsDefaults.tableAngle) {
    stored.tableAngle = board.tableAngle;
  }

  if (
    board.ball.radius !== physicsDefaults.ball.radius ||
    board.ball.mass !== physicsDefaults.ball.mass
  ) {
    stored.ball = {};

    if (board.ball.radius !== physicsDefaults.ball.radius) {
      stored.ball.radius = board.ball.radius;
    }

    if (board.ball.mass !== physicsDefaults.ball.mass) {
      stored.ball.mass = board.ball.mass;
    }
  }

  const physics = serializePhysicsOverrides(board);

  if (physics) {
    stored.physics = physics;
  }

  const surfaceMaterials = serializeSurfaceMaterialOverrides(board);

  if (surfaceMaterials) {
    stored.surfaceMaterials = surfaceMaterials;
  }

  return stored;
};

const serializePhysicsOverrides = (
  board: BoardDefinition,
): BoardDefinitionInput['physics'] | undefined => {
  const plunger =
    board.physics.plunger.maxPullSeconds !==
      physicsDefaults.tuning.plunger.maxPullSeconds ||
    board.physics.plunger.minReleaseSpeed !==
      physicsDefaults.tuning.plunger.minReleaseSpeed ||
    board.physics.plunger.maxReleaseSpeed !==
      physicsDefaults.tuning.plunger.maxReleaseSpeed ||
    board.physics.plunger.bodyMass !== physicsDefaults.tuning.plunger.bodyMass
      ? { ...board.physics.plunger }
      : undefined;
  const flipper =
    board.physics.flipper.swingAngularSpeed !==
      physicsDefaults.tuning.flipper.swingAngularSpeed ||
    board.physics.flipper.collisionAngleStep !==
      physicsDefaults.tuning.flipper.collisionAngleStep
      ? { ...board.physics.flipper }
      : undefined;
  const solver =
    board.physics.solver.epsilon !== physicsDefaults.tuning.solver.epsilon ||
    board.physics.solver.staticSlipThreshold !==
      physicsDefaults.tuning.solver.staticSlipThreshold
      ? { ...board.physics.solver }
      : undefined;

  if (!plunger && !flipper && !solver) {
    return undefined;
  }

  return {
    plunger,
    flipper,
    solver,
  };
};

const serializeSurfaceMaterialOverrides = (
  board: BoardDefinition,
): BoardDefinitionInput['surfaceMaterials'] | undefined => {
  const surfaceMaterials = {
    playfieldWood: serializeSurfaceMaterial(
      board.surfaceMaterials.playfieldWood,
      physicsDefaults.surfaceMaterials.playfieldWood,
    ),
    metalGuide: serializeSurfaceMaterial(
      board.surfaceMaterials.metalGuide,
      physicsDefaults.surfaceMaterials.metalGuide,
    ),
    rubberPost: serializeSurfaceMaterial(
      board.surfaceMaterials.rubberPost,
      physicsDefaults.surfaceMaterials.rubberPost,
    ),
    flipperRubber: serializeSurfaceMaterial(
      board.surfaceMaterials.flipperRubber,
      physicsDefaults.surfaceMaterials.flipperRubber,
    ),
  } satisfies Partial<Record<SurfaceMaterialName, Partial<SurfaceMaterial>>>;

  return Object.values(surfaceMaterials).some((value) => value !== undefined)
    ? surfaceMaterials
    : undefined;
};

const serializeSurfaceMaterial = (
  material: SurfaceMaterial,
  defaults: SurfaceMaterial,
): Partial<SurfaceMaterial> | undefined => {
  const overrides: Partial<SurfaceMaterial> = {};

  if (material.restitution !== defaults.restitution) {
    overrides.restitution = material.restitution;
  }

  if (material.staticFriction !== defaults.staticFriction) {
    overrides.staticFriction = material.staticFriction;
  }

  if (material.dynamicFriction !== defaults.dynamicFriction) {
    overrides.dynamicFriction = material.dynamicFriction;
  }

  if (material.rollingResistance !== defaults.rollingResistance) {
    overrides.rollingResistance = material.rollingResistance;
  }

  if (material.spinDamping !== defaults.spinDamping) {
    overrides.spinDamping = material.spinDamping;
  }

  if (material.compliance !== defaults.compliance) {
    overrides.compliance = material.compliance;
  }

  if (material.grip !== defaults.grip) {
    overrides.grip = material.grip;
  }

  return Object.keys(overrides).length > 0 ? overrides : undefined;
};
