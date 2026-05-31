import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['tests/**/*.test.ts'],
        setupFiles: ['./tests/setup.ts'],
        coverage: {
            include: ['src/dice-logic/dice-parser.ts', 'src/dice-logic/dice-evaluator.ts', 'src/dice-logic/dice-roller.ts', 'src/dice-logic/utils.ts'],
            thresholds: {
                lines: 80,
                functions: 80,
                branches: 70,
                statements: 80,
            },
        },
    },
});
