import { defineConfig } from 'vitest/config';

// The exercise files and nothing else: the skeletons and the answer keys are not
// tests. `npm run exercise` runs them all; `npx vitest run -t "Exercise 2"` runs one step.
export default defineConfig({
  test: {
    include: ['exercises/**/*.exercise.ts'],
  },
});
