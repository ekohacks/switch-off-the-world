// Proves the two claims the README makes, without touching the skeletons: the blank
// skeletons are 4 green and 27 red, and the answer keys make every exercise green. The
// solved run happens in a temporary copy of this folder. Part of `npm run gate`.
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applySolutions } from './solve.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// The README's numbers: 4 green, 27 red, one expected fail. The JSON report counts
// the expected fail (`it.fails` in exercise 1, red by design) as passed, hence 5.
const BLANK = { passed: 5, failed: 27 };

function fail(message) {
  console.error(`check:exercises: ${message}`);
  process.exit(1);
}

function runExercises(cwd) {
  const outputFile = join(cwd, 'exercise-results.json');
  const run = spawnSync(
    process.execPath,
    [
      join(root, 'node_modules', 'vitest', 'vitest.mjs'),
      'run',
      '--reporter=json',
      `--outputFile=${outputFile}`,
    ],
    { cwd, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  if (!existsSync(outputFile)) {
    fail(`vitest wrote no report in ${cwd}\n${run.stderr.toString()}`);
  }
  const report = JSON.parse(readFileSync(outputFile, 'utf8'));
  rmSync(outputFile);
  return {
    passed: report.numPassedTests,
    failed: report.numFailedTests,
    total: report.numTotalTests,
  };
}

const blank = runExercises(root);
if (blank.passed !== BLANK.passed || blank.failed !== BLANK.failed) {
  fail(
    `blank skeletons: expected ${BLANK.passed} passed and ${BLANK.failed} failed, ` +
      `got ${blank.passed} passed and ${blank.failed} failed`,
  );
}

const copy = mkdtempSync(join(tmpdir(), 'switch-off-the-world-'));
try {
  for (const entry of [
    'src',
    'exercises',
    'package.json',
    'tsconfig.json',
    'vitest.config.ts',
  ]) {
    cpSync(join(root, entry), join(copy, entry), { recursive: true });
  }
  symlinkSync(
    join(root, 'node_modules'),
    join(copy, 'node_modules'),
    'junction',
  );
  applySolutions(join(copy, 'exercises'));
  const solved = runExercises(copy);
  if (solved.failed !== 0 || solved.passed !== blank.total) {
    fail(
      `solved: expected ${blank.total} passed, got ${solved.passed} passed and ${solved.failed} failed`,
    );
  }
  console.log(
    `check:exercises: blank ${blank.passed} passed and ${blank.failed} failed; solved ${solved.passed} passed`,
  );
} finally {
  rmSync(copy, { recursive: true, force: true });
}
