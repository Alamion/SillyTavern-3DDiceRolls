import { Body, Mat3, Quaternion, Vec3 } from 'cannon-es';
import {
    BufferGeometry,
    Vector3,
    type Mesh,
    type Material,
    type Quaternion as ThreeQuaternion,
} from 'three';
import type { DiceGeometryData } from './geometries';
import { debug } from '../../utils/logging';

interface DiceVector {
    pos: { x: number; y: number; z: number }
    velocity: { x: number; y: number; z: number }
    angular: { x: number; y: number; z: number }
    axis: { x: number; y: number; z: number; w: number }
}

export const DEFAULT_VECTOR = {
    pos: {
        x: 100 * Math.random(),
        y: 100 * Math.random(),
        z: 250,
    },
    velocity: {
        x: 600 * (Math.random() * 2 + 1),
        y: 750 * (Math.random() * 2 + 1),
        z: 0,
    },
    angular: {
        x: 200 * Math.random(),
        y: 200 * Math.random(),
        z: 100 * Math.random(),
    },
    axis: {
        x: Math.random(),
        y: Math.random(),
        z: Math.random(),
        w: Math.random(),
    },
};

export abstract class DiceShape {
    scale = 50;
    abstract sides: number
    abstract inertia: number
    body: Body;
    geometry: Mesh<BufferGeometry, Material | Material[]>;
    values: number[] = [];

    stopped: boolean | number = false;
    staleIterations = 0;

    vector: DiceVector = { ...DEFAULT_VECTOR };

    constructor(
        public w: number,
        public h: number,
        data: DiceGeometryData,
    ) {
        debug(`DiceShape: Creating dice with ${data.values?.length || 0} sides`);
        this.geometry = data.geometry;
        this.body = data.body;
        this.values = data.values;
    }

    generateVector(v: { x: number; y: number }): DiceVector {
        const dist = Math.sqrt(v.x * v.x + v.y * v.y);
        const boost = (Math.random() * 5 + 1) * dist;
        const vector = { x: v.x / dist, y: v.y / dist };
        const pos = {
            x: -1 * v.x,
            y: -1 * v.y,
            z: Math.random() * 200 + 200,
        };

        const velvec = this.makeRandomVector(vector);
        const velocity = {
            x: velvec.x * boost,
            y: velvec.y * boost,
            z: -10,
        };

        const ang = this.makeRandomVector(vector);
        const angular = {
            x: -(Math.random() * 5 + this.inertia) * ang.y,
            y: (Math.random() * 5 + this.inertia) * ang.x,
            z: 0,
        };
        const axis = {
            x: Math.random(),
            y: Math.random(),
            z: Math.random(),
            w: Math.random(),
        };
        debug('Vector generated', {
            v,
            dist,
            boost,
            vector,
            pos,
            velvec,
            velocity,
            angular,
            axis,
        });
        return {
            pos,
            velocity,
            angular,
            axis,
        };
    }

    makeRandomVector(vector: { x: number; y: number }): { x: number; y: number } {
        const random_angle = (Math.random() * Math.PI) / 5 - Math.PI / 5 / 2;
        const vec = {
            x:
                vector.x * Math.cos(random_angle) -
                vector.y * Math.sin(random_angle),
            y:
                vector.x * Math.sin(random_angle) +
                vector.y * Math.cos(random_angle),
        };
        if (vec.x === 0) vec.x = 0.01;
        if (vec.y === 0) vec.y = 0.01;
        return vec;
    }

    get buffer(): BufferGeometry {
        return this.geometry.geometry as BufferGeometry;
    }

    get result(): number {
        return this.getUpsideValue();
    }

    getUpsideValue(): number {
        const upVector = new Vector3(0, 0, this.sides === 4 ? -1 : 1);
        const normals = this.buffer.attributes.normal.array as Float32Array;
        const groups = this.buffer.groups;

        debug(
            `DiceShape: Calculating result for ${this.sides}-sided die, groups: ${groups.length}, normals count: ${normals.length}`,
        );

        for (let i = 0; i < Math.min(5, groups.length); i++) {
            const g = groups[i];
            debug(
                `  Group ${i}: start=${g.start}, count=${g.count}, materialIndex=${g.materialIndex}`,
            );
        }

        const materialNormals: Map<number, { angle: number; groupIndex: number }> =
            new Map();

        for (let i = 0; i < groups.length; i++) {
            const group = groups[i];
            const matIdx = group.materialIndex ?? 0;

            // Skip material index 0 (blank label) and 1 (usually '0' label for non-d10, or space for d10)
            // Material 0 corresponds to original index -1 (bottom faces on d10)
            // We only want to consider actual numbered faces
            if (matIdx < 2) {
                // debug(`  Skipping group ${i}: materialIndex ${matIdx} is a border/blank face`)
                continue;
            }

            const startVertex = group.start * 3;
            if (startVertex + 2 >= normals.length) {
                debug(
                    `  Skipping group ${i}: startVertex ${startVertex} >= normals.length ${normals.length}`,
                );
                continue;
            }

            const nx = normals[startVertex];
            const ny = normals[startVertex + 1];
            const nz = normals[startVertex + 2];

            if (
                !Number.isFinite(nx) ||
                !Number.isFinite(ny) ||
                !Number.isFinite(nz)
            ) {
                debug(
                    `  Skipping group ${i}: normal has non-finite components (${nx}, ${ny}, ${nz})`,
                );
                continue;
            }

            const normal = new Vector3(nx, ny, nz);

            if (normal.lengthSq() === 0) {
                debug(`  Skipping group ${i}: zero-length normal`);
                continue;
            }

            const worldNormal = normal
                .clone()
                .applyQuaternion(
                    new Quaternion(
                        this.body.quaternion.x,
                        this.body.quaternion.y,
                        this.body.quaternion.z,
                        this.body.quaternion.w,
                    ) as unknown as ThreeQuaternion,
                );

            if (worldNormal.lengthSq() === 0) {
                debug(`  Skipping group ${i}: zero-length worldNormal`);
                continue;
            }

            const n1 = worldNormal.clone().normalize();
            const n2 = upVector.clone().normalize();
            const dot = n1.dot(n2);

            if (!Number.isFinite(dot)) {
                debug(
                    `  Skipping group ${i}: dot product is non-finite (${dot})`,
                );
                continue;
            }

            const clampedDot = Math.max(-1, Math.min(1, dot));
            const angle = Math.acos(clampedDot);

            const existing = materialNormals.get(matIdx);
            if (!existing || angle < existing.angle) {
                materialNormals.set(matIdx, { angle, groupIndex: i });
            }
        }

        debug(`DiceShape: Found ${materialNormals.size} unique materials:`,materialNormals);

        if (materialNormals.size === 0) {
            const randomIndex = Math.floor(Math.random() * this.values.length);
            const fallbackValue =
                (this.values?.[randomIndex] ?? randomIndex + 1) || 1;
            debug(
                `DiceShape: No valid face normals found, using fallback random value: ${fallbackValue}`,
            );
            return fallbackValue;
        }

        let closestMatIndex = 2;
        let closestAngle = Math.PI * 2;

        for (const [matIndex, data] of materialNormals) {
            if (data.angle < closestAngle) {
                closestAngle = data.angle;
                closestMatIndex = matIndex;
            }
        }

        // Map material index (which is offset due to how geometry groups are built)
        // back to a value index. Material indices 2+ correspond to actual numbered faces.
        // Material 2 -> values[0], Material 3 -> values[1], etc.
        const faceIndex = closestMatIndex - 2;
        let result: number;

        if (faceIndex >= 0 && faceIndex < this.values.length) {
            result = this.values[faceIndex];
        } else {
            // Fallback: map as best we can to a valid index
            const approxIndex =
                Math.max(0, Math.min(this.values.length - 1, Math.abs(faceIndex) % this.values.length));
            result = this.values?.[approxIndex] ?? approxIndex + 1;
        }

        debug(
            `DiceShape: Result calculated - closestMatIndex: ${closestMatIndex}, faceIndex: ${faceIndex}, value: ${result}, closestAngle: ${closestAngle}`,
        );
        return result;
    }

    resetBody(): this {
        this.body.vlambda = new Vec3();
        this.body.position = new Vec3();
        this.body.previousPosition = new Vec3();
        this.body.initPosition = new Vec3();
        this.body.velocity = new Vec3();
        this.body.initVelocity = new Vec3();
        this.body.force = new Vec3();
        this.body.torque = new Vec3();
        this.body.quaternion = new Quaternion();
        this.body.initQuaternion = new Quaternion();
        this.body.angularVelocity = new Vec3();
        this.body.initAngularVelocity = new Vec3();
        this.body.interpolatedPosition = new Vec3();
        this.body.interpolatedQuaternion = new Quaternion();
        this.body.inertia = new Vec3();
        this.body.invInertia = new Vec3();
        this.body.invInertiaWorld = new Mat3();
        this.body.invInertiaSolve = new Vec3();
        this.body.invInertiaWorldSolve = new Mat3();
        this.body.wlambda = new Vec3();

        this.body.updateMassProperties();
        return this;
    }

    set(): void {
        // Validate position values before updating geometry
        const pos = this.body.position;
        const quat = this.body.quaternion;

        if (
            !Number.isFinite(pos.x) ||
            !Number.isFinite(pos.y) ||
            !Number.isFinite(pos.z)
        ) {
            debug('DiceShape: Invalid position detected, skipping update');
            return;
        }

        if (
            !Number.isFinite(quat.x) ||
            !Number.isFinite(quat.y) ||
            !Number.isFinite(quat.z) ||
            !Number.isFinite(quat.w)
        ) {
            debug('DiceShape: Invalid quaternion detected, skipping update');
            return;
        }

        this.geometry.position.set(pos.x, pos.y, pos.z);
        this.geometry.quaternion.set(quat.x, quat.y, quat.z, quat.w);
    }

    recreate(vector: { x: number; y: number }, width: number, height: number): void {
        this.w = width;
        this.h = height;
        this.vector = this.generateVector(vector);
        this.stopped = false;
        this.staleIterations = 0;
        this.create();
    }

    create(): void {
        this.body.position.set(
            this.vector.pos.x,
            this.vector.pos.y,
            this.vector.pos.z,
        );
        this.body.quaternion.setFromAxisAngle(
            new Vec3(
                this.vector.axis.x,
                this.vector.axis.y,
                this.vector.axis.z,
            ),
            this.vector.axis.w * Math.PI * 2,
        );
        this.body.angularVelocity.set(
            this.vector.angular.x,
            this.vector.angular.y,
            this.vector.angular.z,
        );
        this.body.velocity.set(
            this.vector.velocity.x,
            this.vector.velocity.y,
            this.vector.velocity.z,
        );
        this.body.linearDamping = 0.1;
        this.body.angularDamping = 0.1;

        debug('DiceShape created:', this.body);
    }
}

export class D20Dice extends DiceShape {
    sides = 20;
    inertia = 6;
    constructor(
        public w: number,
        public h: number,
        public data: DiceGeometryData,
        vector?: { x: number; y: number },
    ) {
        super(w, h, data);
        if (vector) {
            this.vector = this.generateVector(vector);
        }
        this.create();
    }
}

export class D12Dice extends DiceShape {
    sides = 12;
    inertia = 8;
    constructor(
        public w: number,
        public h: number,
        public data: DiceGeometryData,
        vector?: { x: number; y: number },
    ) {
        super(w, h, data);
        if (vector) {
            this.vector = this.generateVector(vector);
        }
        this.create();
    }
}

export class D10Dice extends DiceShape {
    sides = 10;
    inertia = 9;
    constructor(
        public w: number,
        public h: number,
        public data: DiceGeometryData,
        vector?: { x: number; y: number },
    ) {
        super(w, h, data);
        if (vector) {
            this.vector = this.generateVector(vector);
        }
        this.create();
    }
}
export class D100Dice extends DiceShape {
    sides = 10;
    inertia = 9;
    constructor(
        public w: number,
        public h: number,
        public data: DiceGeometryData,
        vector?: { x: number; y: number },
    ) {
        super(w, h, data);
        if (vector) {
            this.vector = this.generateVector(vector);
        }
        this.create();
    }
}

export class D8Dice extends DiceShape {
    sides = 8;
    inertia = 10;
    constructor(
        public w: number,
        public h: number,
        public data: DiceGeometryData,
        vector?: { x: number; y: number },
    ) {
        super(w, h, data);
        if (vector) {
            this.vector = this.generateVector(vector);
        }
        this.create();
    }
}

export class D6Dice extends DiceShape {
    sides = 6;
    inertia = 13;
    constructor(
        public w: number,
        public h: number,
        public data: DiceGeometryData,
        vector?: { x: number; y: number },
    ) {
        super(w, h, data);
        if (vector) {
            this.vector = this.generateVector(vector);
        }
        this.create();
    }
}

export class D4Dice extends DiceShape {
    sides = 4;
    inertia = 5;
    constructor(
        public w: number,
        public h: number,
        public data: DiceGeometryData,
        vector?: { x: number; y: number },
    ) {
        super(w, h, data);
        if (vector) {
            this.vector = this.generateVector(vector);
        }
        this.create();
    }
}

export class D2Dice extends DiceShape {
    sides = 2;
    inertia = 3;
    constructor(
        public w: number,
        public h: number,
        public data: DiceGeometryData,
        vector?: { x: number; y: number },
    ) {
        super(w, h, data);
        if (vector) {
            this.vector = this.generateVector(vector);
        }
        this.create();
    }
}
