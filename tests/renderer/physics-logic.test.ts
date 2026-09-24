import { describe, expect, it } from 'vitest';
import { Body, Sphere, Vec3 } from 'cannon-es';
import { updateRestState, type RestState } from '../../src/dice-logic/renderer/rest';
import { separateSpawns } from '../../src/dice-logic/renderer/spawn';
import { randomOrientation } from '../../src/dice-logic/renderer/shapes';
import { REST_SECONDS } from '../../src/utils/constants';

function die(velocity: [number, number, number], angular: [number, number, number]): RestState {
    return {
        body: { velocity: new Vec3(...velocity), angularVelocity: new Vec3(...angular) },
        stopped: false,
        restingSince: null,
    };
}

describe('rest detection (F-009)', () => {
    it('reads a die only after it has stayed still for REST_SECONDS', () => {
        const d = die([0, 0, 0], [0, 0, 0]);
        updateRestState(d, 0);
        expect(d.stopped).toBe(false);
        updateRestState(d, REST_SECONDS / 2);
        expect(d.stopped).toBe(false);
        updateRestState(d, REST_SECONDS);
        expect(d.stopped).toBe(true);
    });

    it('treats a die that is still tipping as moving', () => {
        const d = die([0, 0, 0], [3, 0, 0]);
        updateRestState(d, 0);
        updateRestState(d, 10);
        expect(d.stopped).toBe(false);
    });

    it('ignores spin about the vertical axis, which cannot change the face', () => {
        const d = die([0, 0, 0], [0, 0, 30]);
        updateRestState(d, 0);
        updateRestState(d, REST_SECONDS);
        expect(d.stopped).toBe(true);
    });

    it('keeps a resting die at rest through small jitter but wakes it when knocked', () => {
        const d = die([0, 0, 0], [0, 0, 0]);
        updateRestState(d, 0);
        updateRestState(d, REST_SECONDS);
        expect(d.stopped).toBe(true);

        d.body.velocity.set(8, 0, 0); // above the moving threshold, below the wake threshold
        updateRestState(d, REST_SECONDS + 0.01);
        expect(d.stopped).toBe(true);

        d.body.velocity.set(100, 0, 0);
        updateRestState(d, REST_SECONDS + 0.02);
        expect(d.stopped).toBe(false);
        expect(d.restingSince).toBeNull();
    });
});

describe('start orientation (F-023)', () => {
    it('is a unit quaternion', () => {
        for (let i = 0; i < 100; i++) {
            const { x, y, z, w } = randomOrientation();
            expect(Math.hypot(x, y, z, w)).toBeCloseTo(1, 10);
        }
    });

    it('is spread evenly: the rotated up-vector has no bias along any axis', () => {
        const n = 20000;
        const sum = new Vec3();
        for (let i = 0; i < n; i++) {
            const { x, y, z, w } = randomOrientation();
            // Up vector (0,0,1) rotated by q.
            sum.x += 2 * (x * z + w * y);
            sum.y += 2 * (y * z - w * x);
            sum.z += 1 - 2 * (x * x + y * y);
        }
        expect(Math.abs(sum.x / n)).toBeLessThan(0.03);
        expect(Math.abs(sum.y / n)).toBeLessThan(0.03);
        expect(Math.abs(sum.z / n)).toBeLessThan(0.03);
    });
});

describe('spawn separation (F-022)', () => {
    const sphere = (x: number, y: number, z: number) => {
        const body = new Body({ mass: 1, shape: new Sphere(10) });
        body.position.set(x, y, z);
        return body;
    };

    it('moves new dice apart from each other and from dice already in the air', () => {
        const inAir = [sphere(0, 0, 300)];
        const fresh = [sphere(0, 0, 300), sphere(1, 1, 300), sphere(2, 0, 300)];

        separateSpawns(fresh, inAir, { x: 500, y: 500 });

        const all = [...inAir, ...fresh];
        for (let i = 0; i < all.length; i++) {
            for (let j = i + 1; j < all.length; j++) {
                expect(all[i].position.distanceTo(all[j].position)).toBeGreaterThanOrEqual(20);
            }
        }
    });

    it('keeps separated dice inside the barriers', () => {
        const fresh = Array.from({ length: 10 }, () => sphere(90, 90, 300));

        separateSpawns(fresh, [], { x: 100, y: 100 });

        for (const body of fresh) {
            expect(Math.abs(body.position.x)).toBeLessThanOrEqual(90);
            expect(Math.abs(body.position.y)).toBeLessThanOrEqual(90);
        }
    });
});

describe('sound location (F-034)', () => {
    it('resolves sounds next to this bundle, whatever other extensions are loaded', async () => {
        const { getExtensionSoundsBaseUrl } = await import('../../src/dice-logic/renderer/sound-manager');
        expect(
            getExtensionSoundsBaseUrl(
                'http://localhost:8000/scripts/extensions/third-party/SillyTavern-3DDiceRolls/dist/index.js',
            ),
        ).toBe('http://localhost:8000/scripts/extensions/third-party/SillyTavern-3DDiceRolls/dist/sounds/');
    });
});
