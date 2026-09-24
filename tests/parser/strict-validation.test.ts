import { describe, expect, it } from 'vitest';
import { parseToAST, validateNotation } from '../../src/dice-logic/dice-parser';
import { NotationError } from '../../src/dice-logic/errors';
import { execute2DRoll } from '../../src/dice-logic/roll-orchestrator';

describe('strict notation validation (F-016, F-015, F-017)', () => {
    it.each([
        ['2d6+', 'Unexpected end of input'],
        ['2d6*', 'Unexpected end of input'],
        ['(2d6', 'Missing closing parenthesis'],
        ['(2d6+3', 'Missing closing parenthesis'],
        ['2d6>=', 'needs a number'],
        ['2d6 3', 'after the end of the roll'],
        ['(1d4+1)d6', 'after the end of the roll'],
        ['0d6', 'dice count must be at least 1'],
        ['1d0', 'at least 1 side'],
        ['5d10>=6f', '"f" needs a comparison'],
        ['2d10@1', 'expected 2 forced value(s), got 1'],
    ])('rejects %s', (notation, message) => {
        expect(validateNotation(notation)).toBe(false);
        expect(() => parseToAST(notation, { strict: true })).toThrow(NotationError);
        expect(() => parseToAST(notation, { strict: true })).toThrow(message);
    });

    it.each([
        '1d20',
        'd6',
        '2d6+3',
        '4d6kh3',
        '(2d6+3)*2',
        '-1d4+2',
        '5d10>=6f=1',
        '3d10>=8f<2',
        '2d20@20,1',
        '4d6@3,3,3,3kh3',
        '3d6!!p',
        '4dF',
        'd[1,3,5]',
        '1d100',
        '2^3',
        '10%3',
    ])('accepts %s', (notation) => {
        expect(validateNotation(notation)).toBe(true);
    });

    it('leaves rolling lenient: notation that rolls today keeps rolling', () => {
        expect(execute2DRoll('2d6+').diceGroups).toHaveLength(1);
        expect(execute2DRoll('0d6').diceGroups[0].rolls).toHaveLength(1);
    });
});
