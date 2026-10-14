import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export const getEngineRevision = (): string => {
  const hash = createHash('sha256');
  for (const file of readdirSync('src', { recursive: true, encoding: 'utf8' })
    .filter((f) => f.endsWith('.ts'))
    .sort())
    hash.update(file).update(readFileSync(join('src', file)));
  hash.update(readFileSync('package-lock.json'));
  return `${execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim().slice(0, 12)}:${hash.digest('hex').slice(0, 16)}`;
};
