import {
  BUILT_IN_TABLES,
  type TableRecord,
} from '../boards/table-library';
import { validateCompiledBoardLayout } from '../boards/layout-validation';
import {
  analyzeBoard,
  type TableAnalysisWarning,
} from '../editor/table-analysis';

export interface ValidateTableCliOptions {
  help: boolean;
  all: boolean;
  failOnWarnings: boolean;
  tableIds: string[];
  error: string | null;
}

export interface TableValidationIssue {
  source: 'layout' | 'analysis';
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
}

export const parseValidateTableCliArgs = (
  args: string[],
): ValidateTableCliOptions => {
  const tableIds: string[] = [];
  let help = false;
  let all = false;
  let failOnWarnings = false;

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

    if (arg.startsWith('-')) {
      return {
        help: false,
        all: false,
        failOnWarnings: false,
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
      tableIds: [],
      error: 'Provide a built-in table id or use --all.',
    };
  }

  if (all && tableIds.length > 0) {
    return {
      help: false,
      all,
      failOnWarnings,
      tableIds: [],
      error: 'Use either explicit table ids or --all, not both.',
    };
  }

  return {
    help,
    all,
    failOnWarnings,
    tableIds,
    error: null,
  };
};

export const resolveBuiltInTablesForValidation = (
  options: Pick<ValidateTableCliOptions, 'all' | 'tableIds'>,
  tables: TableRecord[] = BUILT_IN_TABLES,
): { tables: TableRecord[]; error: string | null } => {
  if (options.all) {
    return {
      tables,
      error: null,
    };
  }

  const selected: TableRecord[] = [];
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
  table: TableRecord,
): TableValidationReport => {
  const layoutDiagnostics = validateCompiledBoardLayout(table.board);
  const analysisWarnings = analyzeBoard(table.board);
  const issues: TableValidationIssue[] = [
    ...layoutDiagnostics.map((diagnostic) => ({
      source: 'layout' as const,
      severity: diagnostic.severity,
      code: diagnostic.code,
      message: diagnostic.message,
    })),
    ...analysisWarnings.map((warning) => mapAnalysisWarningToIssue(warning)),
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
  };
};

export const formatValidateTableUsage = (
  tables: TableRecord[] = BUILT_IN_TABLES,
): string => {
  const lines = [
    'Usage:',
    '  npm run validate-table -- <built-in-table-id>',
    '  npm run validate-table -- --all',
    '  npm run validate-table -- <built-in-table-id> --fail-on-warnings',
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

  if (hasLayoutErrors) {
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
