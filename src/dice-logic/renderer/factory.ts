import type { DiceGroup } from '../types';
import {
    D4DiceGeometry,
    D6DiceGeometry,
    D8DiceGeometry,
    D10DiceGeometry,
    D12DiceGeometry,
    D20DiceGeometry,
    D100DiceGeometry,
    D2DiceGeometry,
    type DiceGeometryData,
} from './geometries';
import { DiceRenderer, type DiceRendererConfig } from './renderer';
import { debug } from '../../utils/logging';

type DiceGeometryClass = new (w: number, h: number, options: { diceColor: string; textColor: string }, scaler: number) => { create(): { clone(): DiceGeometryData }; values: number[] };

const GEOMETRY_CLASSES: Record<number, DiceGeometryClass> = {
    2: D2DiceGeometry,
    4: D4DiceGeometry,
    6: D6DiceGeometry,
    8: D8DiceGeometry,
    10: D10DiceGeometry,
    12: D12DiceGeometry,
    20: D20DiceGeometry,
    100: D100DiceGeometry,
};

export interface DiceFactoryConfig extends DiceRendererConfig {
    diceColor: string
    textColor: string
    scaler: number
}

export class DiceFactory {
    private renderer: DiceRenderer | null = null;

    constructor(
        private width: number,
        private height: number,
        private config: DiceFactoryConfig,
    ) {}

    async rollDice(
        diceGroups: DiceGroup[],
        onComplete: (results: { diceGroup: DiceGroup; values: number[] }[]) => void,
    ): Promise<void> {
        if (this.renderer) {
            this.renderer.dispose();
        }

        const allDiceData: { diceGroup: DiceGroup; geometries: DiceGeometryData[] }[] = [];

        for (const group of diceGroups) {
            const geometries = this.createDiceGeometries(group);
            allDiceData.push({ diceGroup: group, geometries });
        }

        const totalDice = allDiceData.reduce(
            (sum, data) => sum + data.geometries.length,
            0,
        );

        if (totalDice === 0) {
            onComplete([]);
            return;
        }

        this.renderer = new DiceRenderer(this.width, this.height, {
            diceColor: this.config.diceColor,
            textColor: this.config.textColor,
            scaler: this.config.scaler,
        });

        const allGeometries = allDiceData.flatMap((d) => d.geometries);

        this.renderer.roll(allGeometries, (results) => {
            const groupedResults: { diceGroup: DiceGroup; values: number[] }[] = [];
            let resultIndex = 0;

            for (const data of allDiceData) {
                const geomCount = data.geometries.length;
                const slice = results.slice(resultIndex, resultIndex + geomCount);
                resultIndex += geomCount;

                if (data.diceGroup.sides === 100) {
                    const logicalCount = data.diceGroup.count;
                    const expectedGeomCount = logicalCount * 2;

                    if (geomCount !== expectedGeomCount) {
                        debug(
                            'DiceFactory: d100 geometry/result count mismatch, falling back to raw values',
                        );
                        groupedResults.push({
                            diceGroup: data.diceGroup,
                            values: slice,
                        });
                        continue;
                    }

                    const combinedValues: number[] = [];
                    for (let i = 0; i < logicalCount; i++) {
                        const tensRoll = slice[i * 2] ?? 1;
                        const onesRoll = slice[i * 2 + 1] ?? 1;

                        const tensDigit = tensRoll % 10;
                        const onesDigit = onesRoll % 10;
                        let value = tensDigit * 10 + onesDigit;
                        if (value === 0) {
                            value = 100;
                        }
                        combinedValues.push(value);
                    }

                    groupedResults.push({
                        diceGroup: data.diceGroup,
                        values: combinedValues,
                    });
                } else {
                    groupedResults.push({
                        diceGroup: data.diceGroup,
                        values: slice,
                    });
                }
            }

            debug('3D dice roll completed:', groupedResults);
            onComplete(groupedResults);

            setTimeout(() => {
                this.renderer?.dispose();
                this.renderer = null;
            }, 2000);
        });
    }

    private createDiceGeometries(diceGroup: DiceGroup): DiceGeometryData[] {
        const geometries: DiceGeometryData[] = [];

        const isD100 = diceGroup.sides === 100;
        const physicalSides = isD100 ? 10 : diceGroup.sides;
        const physicalPerLogical = isD100 ? 2 : 1;

        const totalPhysicalDice = diceGroup.count * physicalPerLogical;

        for (let i = 0; i < totalPhysicalDice; i++) {
            const geometry = this.createGeometryForSides(physicalSides);
            if (geometry) {
                geometries.push(geometry);
            }
        }

        return geometries;
    }

    private createGeometryForSides(sides: number): DiceGeometryData | null {
        const GeometryClass = GEOMETRY_CLASSES[sides];
        if (!GeometryClass) {
            return null;
        }

        const options = {
            diceColor: this.config.diceColor,
            textColor: this.config.textColor,
        };

        const g = new GeometryClass(this.width, this.height, options, this.config.scaler);
        const geom = g.create().clone();

        if (geom) {
            geom.values = geom.values.map(v => v + 1);
            debug(`DiceFactory: Created ${sides}-sided die with values:`, geom.values);
        }

        return geom;
    }

    dispose(): void {
        this.renderer?.dispose();
        this.renderer = null;
    }
}

export function create3DDiceRoll(
    width: number,
    height: number,
    diceColor: string,
    textColor: string,
): DiceFactory {
    return new DiceFactory(width, height, {
        diceColor,
        textColor,
        scaler: 1,
    });
}
