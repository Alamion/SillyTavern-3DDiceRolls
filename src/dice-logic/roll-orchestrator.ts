import { parseToAST } from './dice-parser';
import { evaluateDiceAST, detectRerolls, detectExplosion, detectUnique } from './dice-evaluator';
import { prepareDiceGeometries } from './renderer';
import { startPhysicsRoll } from './renderer';
import type { ASTNode, DiceGroupNode, DiceRoll, RollResult } from './types';
import { buildGroupKey } from './utils';
import { debug, warn } from '../utils/logging';
import { MixedRollConfig } from '../utils/settings';

const SUPPORTED_3D_SIDES = new Set([2, 4, 6, 8, 10, 12, 20, 100]);

function has3DSupportedDice(ast: ASTNode): boolean {
    let found = false;
    function traverse(node: ASTNode): void {
        if (node.type === 'DiceGroup') {
            if (SUPPORTED_3D_SIDES.has(node.sides)) {
                found = true;
            }
        } else if (node.type === 'BinaryOp') {
            traverse(node.left);
            traverse(node.right);
        } else if (node.type === 'UnaryOp') {
            traverse(node.operand);
        } else if (node.type === 'Parenthesized') {
            traverse(node.expression);
        }
    }
    traverse(ast);
    return found;
}

function extractDiceGroupNodes(ast: ASTNode): DiceGroupNode[] {
    const groups: DiceGroupNode[] = [];
    function traverse(node: ASTNode): void {
        if (node.type === 'DiceGroup') {
            groups.push(node);
        } else if (node.type === 'BinaryOp') {
            traverse(node.left);
            traverse(node.right);
        } else if (node.type === 'UnaryOp') {
            traverse(node.operand);
        } else if (node.type === 'Parenthesized') {
            traverse(node.expression);
        }
    }
    traverse(ast);
    return groups;
}

export async function executeUnifiedRoll(
    notation: string,
    config?: Partial<MixedRollConfig>,
): Promise<RollResult> {
    debug('Executing unified roll:', notation);

    const defaultConfig: MixedRollConfig = {
        diceColor: '#4a90e2',
        textColor: '#ffffff',
        enable3dDice: false,
        ...config,
    };

    let ast: ASTNode | null = null;

    try {
        ast = parseToAST(notation);

        if (!defaultConfig.enable3dDice || !has3DSupportedDice(ast)) {
            return evaluateDiceAST(ast, notation);
        }

        const diceGroupNodes = extractDiceGroupNodes(ast);
        const flatGroups = diceGroupNodes.map(g => ({
            sides: g.sides,
            count: g.count,
            modifiers: g.modifiers,
            customFaces: g.customFaces,
            fudge: g.fudge,
        }));

        const { geometries, groupSizes } = prepareDiceGeometries(flatGroups, {
            diceColor: defaultConfig.diceColor,
            textColor: defaultConfig.textColor,
            scaler: 1,
        });

        const handle = startPhysicsRoll(
            {
                diceColor: defaultConfig.diceColor,
                textColor: defaultConfig.textColor,
                scaler: 1,
            },
            geometries,
            groupSizes,
        );

        let flatValues = await handle.settle;

        const preGeneratedValues = new Map<string, DiceRoll[]>();
        let flatOffset = 0;

        for (let g = 0; g < diceGroupNodes.length; g++) {
            const group = diceGroupNodes[g];
            const isD100 = group.sides === 100;
            const multiplier = isD100 ? 2 : 1;
            const key = buildGroupKey(group, g);

            let physCount = groupSizes[g];

            const allGroupRolls: DiceRoll[] = [];
            for (let d = 0; d < group.count; d++) {
                if (isD100) {
                    const tens = flatValues[flatOffset + d * multiplier] % 10;
                    const ones = flatValues[flatOffset + d * multiplier + 1] % 10;
                    allGroupRolls.push({
                        sides: 100,
                        value: (tens * 10 + ones) === 0 ? 100 : (tens * 10 + ones),
                        dropped: false,
                    });
                } else {
                    allGroupRolls.push({
                        sides: group.sides,
                        value: flatValues[flatOffset + d],
                        dropped: false,
                    });
                }
            }

            // Reroll (including 'once' support)
            const rerolledOnceIndices = new Set<number>();
            for (let iter = 0; iter < 10; iter++) {
                const rerollLocalIndices = detectRerolls(group, allGroupRolls.map(r => r.value), allGroupRolls);
                if (rerollLocalIndices.length === 0) break;

                // Mark dice as rerolledOnce before rethrow
                if (group.modifiers.reroll?.once) {
                    for (const ri of rerollLocalIndices) {
                        rerolledOnceIndices.add(ri);
                    }
                }

                const rerollFlatIndices: number[] = [];
                for (const idx of rerollLocalIndices) {
                    for (let p = 0; p < multiplier; p++) {
                        rerollFlatIndices.push(flatOffset + idx * multiplier + p);
                    }
                }

                const allLockIndices: number[] = [];
                for (let i = 0; i < flatValues.length; i++) {
                    if (!rerollFlatIndices.includes(i)) {
                        allLockIndices.push(i);
                    }
                }

                handle.renderer.lockDice(allLockIndices);
                flatValues = await handle.rethrow(rerollFlatIndices);

                for (const ri of rerollLocalIndices) {
                    let newValue: number;
                    if (isD100) {
                        const tens = flatValues[flatOffset + ri * multiplier] % 10;
                        const ones = flatValues[flatOffset + ri * multiplier + 1] % 10;
                        newValue = (tens * 10 + ones) === 0 ? 100 : (tens * 10 + ones);
                    } else {
                        newValue = flatValues[flatOffset + ri];
                    }
                    allGroupRolls[ri] = {
                        ...allGroupRolls[ri],
                        value: newValue,
                        rerolledOnce: rerolledOnceIndices.has(ri) || undefined,
                    };
                }
            }

            // Unique modifier
            for (let iter = 0; iter < 10; iter++) {
                const uniqueLocalIndices = detectUnique(group, allGroupRolls);
                if (uniqueLocalIndices.length === 0) break;

                const uniqueFlatIndices: number[] = [];
                for (const idx of uniqueLocalIndices) {
                    for (let p = 0; p < multiplier; p++) {
                        uniqueFlatIndices.push(flatOffset + idx * multiplier + p);
                    }
                }

                const allLockIndices: number[] = [];
                for (let i = 0; i < flatValues.length; i++) {
                    if (!uniqueFlatIndices.includes(i)) {
                        allLockIndices.push(i);
                    }
                }

                handle.renderer.lockDice(allLockIndices);
                flatValues = await handle.rethrow(uniqueFlatIndices);

                for (const ri of uniqueLocalIndices) {
                    let newValue: number;
                    if (isD100) {
                        const tens = flatValues[flatOffset + ri * multiplier] % 10;
                        const ones = flatValues[flatOffset + ri * multiplier + 1] % 10;
                        newValue = (tens * 10 + ones) === 0 ? 100 : (tens * 10 + ones);
                    } else {
                        newValue = flatValues[flatOffset + ri];
                    }
                    allGroupRolls[ri] = {
                        ...allGroupRolls[ri],
                        value: newValue,
                        rerolledOnce: group.modifiers.unique?.once ? true : undefined,
                    };
                }

                if (group.modifiers.unique?.once) break;
            }

            // Explosion (supports compound and penetrating)
            let safetyCounter = 0;
            while (safetyCounter < 100) {
                const explodeIndices = detectExplosion(group, allGroupRolls);
                if (explodeIndices.length === 0) break;

                const isCompounding = group.modifiers.explode?.compounding ?? false;
                const isPenetrating = group.modifiers.explode?.penetrating ?? false;

                if (isCompounding) {
                    for (const idx of explodeIndices) {
                        allGroupRolls[idx] = {
                            ...allGroupRolls[idx],
                            exploded: true,
                            compounded: true,
                            penetrating: isPenetrating || undefined,
                        };
                    }
                } else {
                    for (const idx of explodeIndices) {
                        allGroupRolls[idx] = {
                            ...allGroupRolls[idx],
                            exploded: true,
                            penetrating: isPenetrating || undefined,
                        };
                    }
                }

                const extraData = prepareDiceGeometries(
                    [{ sides: isD100 ? 10 : group.sides, count: explodeIndices.length * multiplier, modifiers: {}, fudge: group.fudge }],
                    { diceColor: defaultConfig.diceColor, textColor: defaultConfig.textColor, scaler: 1 },
                );

                const explosionValues = await handle.addDice(extraData.geometries);
                physCount += explosionValues.length;

                let evIdx = 0;
                for (let ei = 0; ei < explodeIndices.length; ei++) {
                    const explodeIdx = explodeIndices[ei];

                    for (let p = 0; p < multiplier; p++) {
                        let rawVal = explosionValues[evIdx++];

                        if (isD100) {
                            const tens = rawVal % 10;
                            const ones = (p + 1 < multiplier) ? explosionValues[evIdx++] % 10 : 0;
                            rawVal = (tens * 10 + ones) === 0 ? 100 : (tens * 10 + ones);
                        }

                        const explosionVal = isPenetrating ? Math.max(0, rawVal - 1) : rawVal;

                        if (isCompounding) {
                            const existing = allGroupRolls[explodeIdx];
                            allGroupRolls[explodeIdx] = {
                                ...existing,
                                value: existing.value + explosionVal,
                                compounded: true,
                            };
                        } else {
                            allGroupRolls.push({
                                sides: isD100 ? 100 : group.sides,
                                value: explosionVal,
                                dropped: false,
                                penetrating: isPenetrating || undefined,
                            });
                        }

                        if (!isD100) break; // non-d100: only one value per die
                    }
                }

                safetyCounter++;
            }

            groupSizes[g] = allGroupRolls.length;
            preGeneratedValues.set(key, allGroupRolls);
            flatOffset += physCount;
        }

        handle.arrangeAndDismiss();

        const result = evaluateDiceAST(ast, notation, preGeneratedValues);
        return result;

    } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        warn('Unified roll failed:', errMsg);
        if (!ast) {
            ast = parseToAST(notation);
        }
        return evaluateDiceAST(ast!, notation);
    }
}

export function execute2DRoll(notation: string): RollResult {
    debug('Executing 2D roll:', notation);
    const ast = parseToAST(notation);
    return evaluateDiceAST(ast, notation);
}
