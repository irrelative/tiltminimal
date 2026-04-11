import {
  formatValidateTableUsage,
  formatValidationReport,
  parseValidateTableCliArgs,
  resolveBuiltInTablesForValidation,
  shouldFailValidation,
  validateTableRecord,
} from './table-validation';

const processLike = globalThis as {
  process?: {
    argv?: string[];
    exitCode?: number;
  };
};

const argv = processLike.process?.argv?.slice(2) ?? [];
const parsed = parseValidateTableCliArgs(argv);

if (parsed.help) {
  console.log(formatValidateTableUsage());
} else if (parsed.error) {
  console.error(parsed.error);
  console.error('');
  console.error(formatValidateTableUsage());
  if (processLike.process) {
    processLike.process.exitCode = 1;
  }
} else {
  const resolved = resolveBuiltInTablesForValidation(parsed);

  if (resolved.error) {
    console.error(resolved.error);
    console.error('');
    console.error(formatValidateTableUsage());
    if (processLike.process) {
      processLike.process.exitCode = 1;
    }
  } else {
    const reports = resolved.tables.map(validateTableRecord);
    console.log(formatValidationReport(reports));

    if (shouldFailValidation(reports, parsed) && processLike.process) {
      processLike.process.exitCode = 1;
    }
  }
}
