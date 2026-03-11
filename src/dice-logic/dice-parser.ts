import type { DiceGroup, DiceModifiers, ParseResult } from './types';
import { debug } from '../utils/logging';

const DICE_REGEX = /([+-]?)\s*(?:(\d+)\s*#\s*)?(\d+)?d(\d+)(?:(kh|kl|dh|dl|r|!!|!|u|s)(\d+)?)?/i;
const NUMBER_REGEX = /([+-]?)\s*(\d+)(?!\s*d)/i;

function parseDiceModifiers(modifier: string, value?: string): DiceModifiers {
    const mods: DiceModifiers = {};
    const numValue = value ? parseInt(value, 10) : 1;

    switch (modifier.toLowerCase()) {
        case 'kh':
        case 'k':
            mods.keepHighest = numValue;
            break;
        case 'kl':
            mods.keepLowest = numValue;
            break;
        case 'dh':
            mods.dropHighest = numValue;
            break;
        case 'dl':
            mods.dropLowest = numValue;
            break;
        case 'r':
            mods.reroll = numValue;
            break;
        case '!!':
            mods.explode = numValue;
            break;
        case '!':
            mods.explode = 1;
            break;
        case 'u':
            mods.sort = 'asc';
            break;
        case 's':
            mods.sort = 'desc';
            break;
    }

    return mods;
}

function parseDiceGroup(match: RegExpExecArray): { group: DiceGroup; operation: '+' | '-' } | null {
    const operation = (match[1] === '-' ? '-' : '+') as '+' | '-';
    const count = match[3] ? parseInt(match[3], 10) : 1;
    const sides = parseInt(match[4], 10);

    if (sides < 1 || count < 1) {
        return null;
    }

    const modifiers: DiceModifiers = {};

    if (match[5]) {
        Object.assign(modifiers, parseDiceModifiers(match[5], match[6]));
    }

    return {
        group: { count, sides, modifiers },
        operation,
    };
}

export function parseDiceNotation(notation: string): ParseResult {
    debug('Parsing dice notation:', notation);
    const result: ParseResult = {
        expressions: [],
        original: notation,
    };

    const workingNotation = notation.replace(/\s+/g, ' ');
    let position = 0;

    while (position < workingNotation.length) {
        const remaining = workingNotation.slice(position);
        const diceMatch = DICE_REGEX.exec(remaining);
        const numberMatch = NUMBER_REGEX.exec(remaining);

        let bestMatch: { type: 'dice' | 'number'; match: RegExpExecArray; index: number } | null = null;

        if (diceMatch && diceMatch.index === 0) {
            bestMatch = { type: 'dice', match: diceMatch, index: 0 };
        }

        if (numberMatch && numberMatch.index === 0) {
            if (!bestMatch || numberMatch[0].length > 0) {
                bestMatch = { type: 'number', match: numberMatch, index: 0 };
            }
        }

        if (!bestMatch) {
            position++;
            continue;
        }

        if (bestMatch.type === 'dice') {
            const parsed = parseDiceGroup(bestMatch.match);
            if (parsed) {
                result.expressions.push({
                    type: 'dice',
                    value: parsed.group,
                    operation: parsed.operation,
                });
            }
        } else {
            const operation = (bestMatch.match[1] === '-' ? '-' : '+') as '+' | '-';
            const value = parseInt(bestMatch.match[2], 10);
            result.expressions.push({
                type: 'number',
                value,
                operation,
            });
        }

        position += bestMatch.match[0].length;
    }

    if (result.expressions.length === 0 && /\d/.test(workingNotation)) {
        const simpleNumber = parseInt(workingNotation.replace(/[^\d-]/g, ''), 10);
        if (!isNaN(simpleNumber)) {
            result.expressions.push({
                type: 'number',
                value: Math.abs(simpleNumber),
                operation: simpleNumber < 0 ? '-' : '+',
            });
        }
    }

    if (result.expressions.length === 0) {
        debug('Failed to parse dice notation:', notation);
    } else {
        debug('Successfully parsed notation:', notation, '->', result.expressions.length, 'expressions');
    }

    return result;
}

export function validateNotation(notation: string): boolean {
    if (!notation || notation.trim().length === 0) {
        return false;
    }

    const parsed = parseDiceNotation(notation);
    return parsed.expressions.length > 0;
}
