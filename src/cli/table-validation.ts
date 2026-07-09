import { BUILT_IN_TABLES, type BuiltInTable } from '../boards/table-library';
import { validateCompiledBoardLayout } from '../boards/layout-validation';
import {
  analyzeBoard,
  type TableAnalysisWarning,
} from '../validation/table-analysis';
import {
  analyzePlayability,
  type PlayabilityIssue,
  type PlayabilityMode,
} from '../validation/table-playability';

export interface ValidateTableCliOptions {
  help: boolean;
  all: boolean;
  failOnWarnings: boolean;
  playabilityMode: PlayabilityMode;
  tableIds: string[];
  error: string | null;
}

export interface TableValidationIssue {
  source: 'layout' | 'analysis' | 'playability';
  severity: 'error' | 'warning';
  code: string;
  message: string;
}

export interface TableValidationReport {
  tableId: string;
  tableName: string;
  issues: TableValidationIssue[];
  layoutErrors: number;
  layoutWarnings: number;
  analysisWarnings: number;
  playabilityErrors: number;
  playabilityWarnings: number;
}

export const parseValidateTableCliArgs = (
  args: string[],
): ValidateTableCliOptions => {
  const tableIds: string[] = [];
  let help = false;
  let all = false;
  let failOnWarnings = false;
  let playabilityMode: PlayabilityMode = 'normal';

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      help = true;
      continue;
    }

    if (arg === '--all') {
      all = true;
      continue;
    }

    if (arg === '--fail-on-warnings') {
      failOnWarnings = true;
      continue;
    }

    if (arg === '--deep-playability') {
      playabilityMode = 'deep';
      continue;
    }

    if (arg.startsWith('-')) {
      return {
        help: false,
        all: false,
        failOnWarnings: false,
        playabilityMode: 'normal',
        tableIds: [],
        error: `Unknown flag: ${arg}`,
      };
    }

    tableIds.push(arg);
  }

  if (!help && !all && tableIds.length === 0) {
    return {
      help: false,
      all: false,
      failOnWarnings,
      playabilityMode,
      tableIds: [],
      error: 'Provide a built-in table id or use --all.',
    };
  }

  if (all && tableIds.length > 0) {
    return {
      help: false,
      all,
      failOnWarnings,
      playabilityMode,
      tableIds: [],
      error: 'Use either explicit table ids or --all, not both.',
    };
  }

  return {
    help,
    all,
    failOnWarnings,
    playabilityMode,
    tableIds,
    error: null,
  };
};

export const resolveBuiltInTablesForValidation = (
  options: Pick<ValidateTableCliOptions, 'all' | 'tableIds'>,
  tables: BuiltInTable[] = BUILT_IN_TABLES,
): { tables: BuiltInTable[]; error: string | null } => {
  if (options.all) {
    return {
      tables,
      error: null,
    };
  }

  const selected: BuiltInTable[] = [];
  const missing: string[] = [];

  for (const id of options.tableIds) {
    const table = tables.find((candidate) => candidate.id === id);

    if (!table) {
      missing.push(id);
      continue;
    }

    selected.push(table);
  }

  if (missing.length > 0) {
    return {
      tables: [],
      error: `Unknown built-in table id${missing.length === 1 ? '' : 's'}: ${missing.join(', ')}`,
    };
  }

  return {
    tables: selected,
    error: null,
  };
};

export const validateTableRecord = (
  table: BuiltInTable,
  options: Pick<ValidateTableCliOptions, 'playabilityMode'> = {
    playabilityMode: 'normal',
  },
): TableValidationReport => {
  const layoutDiagnostics = validateCompiledBoardLayout(table.board);
  const analysisWarnings = analyzeBoard(table.board);
  const playabilityIssues = analyzePlayability(table.board, {
    mode: options.playabilityMode,
  });
  const issues: TableValidationIssue[] = [
    ...layoutDiagnostics.map((diagnostic) => ({
      source: 'layout' as const,
      severity: diagnostic.severity,
      code: diagnostic.code,
      message: diagnostic.message,
    })),
    ...analysisWarnings.map((warning) => mapAnalysisWarningToIssue(warning)),
    ...playabilityIssues.map((issue) => mapPlayabilityIssueToIssue(issue)),
  ];

  return {
    tableId: table.id,
    tableName: table.board.name,
    issues,
    layoutErrors: layoutDiagnostics.filter(
      (diagnostic) => diagnostic.severity === 'error',
    ).length,
    layoutWarnings: layoutDiagnostics.filter(
      (diagnostic) => diagnostic.severity === 'warning',
    ).length,
    analysisWarnings: analysisWarnings.length,
    playabilityErrors: playabilityIssues.filter(
      (issue) => issue.severity === 'error',
    ).length,
    playabilityWarnings: playabilityIssues.filter(
      (issue) => issue.severity === 'warning',
    ).length,
  };
};

export const formatValidateTableUsage = (
  tables: BuiltInTable[] = BUILT_IN_TABLES,
): string => {
  const lines = [
    'Usage:',
    '  npm run validate-table -- <built-in-table-id>',
    '  npm run validate-table -- --all',
    '  npm run validate-table -- <built-in-table-id> --fail-on-warnings',
    '  npm run validate-table -- <built-in-table-id> --deep-playability',
    '',
    'Built-in table ids:',
    ...tables.map((table) => `  - ${table.id}`),
  ];

  return lines.join('\n');
};

export const formatValidationReport = (
  reports: TableValidationReport[],
): string => {
  return reports
    .map((report) => {
      const lines = [
        `${report.tableId} (${report.tableName})`,
        `  layout: ${report.layoutErrors} error${report.layoutErrors === 1 ? '' : 's'}, ${report.layoutWarnings} warning${report.layoutWarnings === 1 ? '' : 's'}`,
        `  analysis: ${report.analysisWarnings} warning${report.analysisWarnings === 1 ? '' : 's'}`,
        `  playability: ${report.playabilityErrors} error${report.playabilityErrors === 1 ? '' : 's'}, ${report.playabilityWarnings} warning${report.playabilityWarnings === 1 ? '' : 's'}`,
      ];

      for (const issue of report.issues) {
        lines.push(
          `  - ${issue.severity.toUpperCase()} [${issue.source}:${issue.code}] ${issue.message}`,
        );
      }

      if (report.issues.length === 0) {
        lines.push('  - OK no issues found');
      }

      return lines.join('\n');
    })
    .join('\n\n');
};

export const shouldFailValidation = (
  reports: TableValidationReport[],
  options: Pick<ValidateTableCliOptions, 'failOnWarnings'>,
): boolean => {
  const hasLayoutErrors = reports.some((report) => report.layoutErrors > 0);
  const hasPlayabilityErrors = reports.some(
    (report) => report.playabilityErrors > 0,
  );

  if (hasLayoutErrors || hasPlayabilityErrors) {
    return true;
  }

  if (!options.failOnWarnings) {
    return false;
  }

  return reports.some((report) => report.issues.length > 0);
};

const mapAnalysisWarningToIssue = (
  warning: TableAnalysisWarning,
): TableValidationIssue => ({
  source: 'analysis',
  severity: warning.severity,
  code: warning.code,
  message: warning.message,
});

const mapPlayabilityIssueToIssue = (
  issue: PlayabilityIssue,
): TableValidationIssue => ({
  source: 'playability',
  severity: issue.severity,
  code: issue.code,
  message: issue.message,
});
