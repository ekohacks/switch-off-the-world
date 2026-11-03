// The answer keys, copied over the skeletons with their import paths one level
// shallower: `npm run solve`. `npm run reset` is a git checkout of the two skeletons.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const KEYS = [
  ['solutions/httpClient.ts', 'httpClient.skeleton.ts'],
  ['solutions/retry.ts', 'retry.skeleton.ts'],
];

export function solved(source) {
  return source
    .replaceAll("'../../src/", "'../src/")
    .replaceAll("'../httpClient.skeleton.ts'", "'./httpClient.skeleton.ts'");
}

export function applySolutions(exercisesDir) {
  for (const [key, skeleton] of KEYS) {
    const source = readFileSync(join(exercisesDir, key), 'utf8');
    writeFileSync(join(exercisesDir, skeleton), solved(source));
  }
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (invokedDirectly) {
  applySolutions(
    resolve(dirname(fileURLToPath(import.meta.url)), '..', 'exercises'),
  );
  console.log(
    'Answer keys copied over the skeletons. `npm run reset` brings them back.',
  );
}
