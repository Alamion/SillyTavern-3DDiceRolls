import { describe, expect, it } from 'vitest';
import { rewriteWodDifficulty } from '../../src/dice-logic/notation-utils';

describe('rewriteWodDifficulty', () => {
    it('moves every d10 threshold and keeps other modifiers (F-013)', () => {
        expect(rewriteWodDifficulty('2d10>=6f=1+3d10>=6!', 7)).toBe('2d10>=7f=1+3d10>=7!');
    });

    it('rewrites grouped pools', () => {
        expect(rewriteWodDifficulty('(2d10+3d10)>=6f=1', 7)).toBe('(2d10+3d10)>=7f=1');
    });

    it('leaves non-d10 thresholds and plain d10 untouched', () => {
        expect(rewriteWodDifficulty('1d20>=15 + 2d10 + d10>=4', 8)).toBe('1d20>=15 + 2d10 + d10>=8');
    });

    it('clamps the difficulty to 1..10', () => {
        expect(rewriteWodDifficulty('3d10>=6', 12)).toBe('3d10>=10');
        expect(rewriteWodDifficulty('3d10>=6', 0)).toBe('3d10>=1');
    });
});
