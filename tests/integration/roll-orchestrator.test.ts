import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Scripted stand-in for the 3D renderer: dice "land" on values the test queues, so the
 * orchestrator's handling of physical values is tested without WebGL or physics.
 */
const SUPPORTED = new Set([2, 4, 6, 8, 10, 12, 20, 100]);

interface FakeGeometry {
    sides: number;
}

const script = vi.hoisted(() => ({
    settle: [] as number[],
    added: [] as number[][],
    rethrows: [] as number[][],
    addDiceError: null as Error | null,
    addedGeometries: [] as { sides: number }[][],
    arrangeAndDismiss: vi.fn(),
}));

vi.mock('../../src/dice-logic/renderer', () => ({
    prepareDiceGeometries: (groups: { sides: number; count: number }[]) => {
        const geometries: FakeGeometry[] = [];
        const groupSizes: number[] = [];
        for (const group of groups) {
            if (!SUPPORTED.has(group.sides)) {
                groupSizes.push(0);
                continue;
            }
            const physical = group.count * (group.sides === 100 ? 2 : 1);
            for (let i = 0; i < physical; i++) {
                geometries.push({ sides: group.sides === 100 && i % 2 === 1 ? 10 : group.sides });
            }
            groupSizes.push(physical);
        }
        return { geometries, groupSizes };
    },
    startPhysicsRoll: () => {
        let current = [...script.settle];
        return {
            renderer: { lockDice: () => {} },
            settle: Promise.resolve(current),
            rethrow: async (indices: number[]) => {
                const next = script.rethrows.shift() ?? [];
                indices.forEach((flatIndex, i) => {
                    current[flatIndex] = next[i];
                });
                current = [...current];
                return current;
            },
            addDice: async (geometries: FakeGeometry[]) => {
                if (script.addDiceError) throw script.addDiceError;
                script.addedGeometries.push(geometries);
                return script.added.shift() ?? [];
            },
            arrangeAndDismiss: script.arrangeAndDismiss,
        };
    },
}));

const { executeUnifiedRoll } = await import('../../src/dice-logic/roll-orchestrator');

const roll3D = (notation: string) => executeUnifiedRoll(notation, { enable3dDice: true });

/** Pins the 2D evaluator's RNG (crypto) to its lowest or highest face. */
function pin2DRandom(face: 'lowest' | 'highest'): void {
    vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation(<T extends ArrayBufferView | null>(buf: T) => {
        (buf as unknown as Uint32Array).fill(face === 'lowest' ? 0 : 0xffffffff);
        return buf;
    });
}

beforeEach(() => {
    script.settle = [];
    script.added = [];
    script.rethrows = [];
    script.addDiceError = null;
    script.addedGeometries = [];
    script.arrangeAndDismiss.mockClear();
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('3D roll orchestration', () => {
    it('keeps physical values with their own group when a group has no 3D model (F-004)', async () => {
        script.settle = [4, 5];
        pin2DRandom('lowest'); // the 2D d7 rolls a 1

        const result = await roll3D('1d7+2d6');

        const d7 = result.diceGroups.find((g) => g.sides === 7)!;
        const d6 = result.diceGroups.find((g) => g.sides === 6)!;
        expect(d7.rolls.map((r) => r.value)).toEqual([1]);
        expect(d6.rolls.map((r) => r.value)).toEqual([4, 5]);
        expect(result.total).toBe(10);
    });

    it('throws a tens-and-ones pair for an exploding d100 (F-010)', async () => {
        script.settle = [0, 0]; // 00 + 0 → 100, explodes
        script.added = [[7, 3]]; // tens face 7, ones face 3 → 73

        const result = await roll3D('1d100!');

        expect(script.addedGeometries[0].map((g) => g.sides)).toEqual([100, 10]);
        expect(result.diceGroups[0].rolls.map((r) => r.value)).toEqual([100, 73]);
        expect(result.total).toBe(173);
    });

    it('keeps compounding while each added die explodes (F-011)', async () => {
        script.settle = [6];
        script.added = [[6], [6], [2]];

        const result = await roll3D('1d6!!');

        expect(result.total).toBe(20);
        expect(result.diceGroups[0].rolls).toHaveLength(1);
    });

    it('falls back to 2D instead of inventing a d20 value for an invalid physics value (F-014)', async () => {
        script.settle = [Number.NaN];
        pin2DRandom('highest');

        const result = await roll3D('1d6');

        expect(result.total).toBe(6);
        expect(script.arrangeAndDismiss).toHaveBeenCalled();
    });

    it('dismisses thrown dice when the roll fails midway (F-018)', async () => {
        script.settle = [6];
        script.addDiceError = new Error('renderer lost');
        pin2DRandom('lowest');

        const result = await roll3D('1d6!');

        expect(script.arrangeAndDismiss).toHaveBeenCalledTimes(1);
        expect(result.total).toBe(1);
    });

    it('explains a 3D failure once instead of toasting a raw error on every roll (F-025)', async () => {
        script.settle = [6];
        script.addDiceError = new Error('WebGL context lost');
        const toast = vi.mocked(globalThis.toastr.warning);
        toast.mockClear();
        vi.resetModules(); // fresh page load: the notice has not been shown yet
        const fresh = await import('../../src/dice-logic/roll-orchestrator');

        await fresh.executeUnifiedRoll('1d6!', { enable3dDice: true });
        await fresh.executeUnifiedRoll('1d6!', { enable3dDice: true });

        expect(toast).toHaveBeenCalledTimes(1);
        expect(String(toast.mock.calls[0][0])).toContain('rolled in 2D');
    });

    it('reports notation errors as such, not as a 3D failure (F-025)', async () => {
        script.settle = [4];
        const toast = vi.mocked(globalThis.toastr.warning);
        toast.mockClear();

        await expect(roll3D('1d6+2d7@1')).rejects.toThrow(/Forced roll count mismatch/);

        expect(toast.mock.calls.some(([message]) => String(message).includes('3D dice could not run'))).toBe(false);
        expect(script.arrangeAndDismiss).toHaveBeenCalled();
    });

    it('rerolls in 3D as long as the 2D evaluator would (F-031)', async () => {
        script.settle = [1];
        script.rethrows = [...Array<number[]>(15).fill([1]), [6]];

        const result = await roll3D('1d6r<5');

        expect(result.diceGroups[0].rolls.map((r) => r.value)).toEqual([6]);
    });
});
