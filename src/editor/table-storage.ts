import {
  BUILT_IN_TABLES,
  cloneBoardDefinition,
  normalizeBoardDefinition,
  type TableRecord,
} from '../boards/table-library';

const STORAGE_KEY = 'pball-web.tables.v1';

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
    board: cloneBoardDefinition(table.board),
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
      tables: Array.isArray(parsed.tables) ? parsed.tables : [],
    };
  } catch {
    return {
      activeTableId: null,
      tables: [],
    };
  }
};

const writeStorageState = (
  state: StoredTablesState,
  storage: Storage,
): void => {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
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
