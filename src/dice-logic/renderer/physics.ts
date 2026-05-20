import {
    Body,
    ContactMaterial,
    Material,
    NaiveBroadphase,
    Plane,
    Vec3,
    World,
} from 'cannon-es';
import type { DiceShape } from './shapes';

export class PhysicsWorld {
    world: World;
    diceMaterial: Material;
    deskMaterial: Material;
    barrierMaterial: Material;
    lastCallTime = 0;

    constructor(public WIDTH: number, public HEIGHT: number) {
        // Use stronger gravity so dice hit the table quickly but stay in view
        this.world = new World({ gravity: new Vec3(0, 0, -1000) });
        this.world.broadphase = new NaiveBroadphase();
        this.world.allowSleep = true;

        this.diceMaterial = new Material('dice');
        this.deskMaterial = new Material('desk');
        this.barrierMaterial = new Material('barrier');

        this.buildWalls();
    }

    buildWalls(): void {
        this.world.addContactMaterial(
            new ContactMaterial(this.deskMaterial, this.diceMaterial, {
                friction: 0.01,
                restitution: 0.2,
                contactEquationRelaxation: 3,
                contactEquationStiffness: 1e8,
            }),
        );
        this.world.addContactMaterial(
            new ContactMaterial(this.barrierMaterial, this.diceMaterial, {
                friction: 0.01,
                restitution: 0.6,
                contactEquationRelaxation: 3,
                contactEquationStiffness: 1e8,
            }),
        );
        this.world.addContactMaterial(
            new ContactMaterial(this.diceMaterial, this.diceMaterial, {
                friction: 0.1,
                restitution: 0.5,
                contactEquationRelaxation: 3,
                contactEquationStiffness: 1e8,
            }),
        );

        // Ground plane - rotated to face upward (positive Z)
        const ground = new Body({
            allowSleep: false,
            mass: 0,
            shape: new Plane(),
            material: this.deskMaterial,
        });

        ground.quaternion.setFromAxisAngle(new Vec3(1, 0, 0), 0);
        this.world.addBody(ground);

        let barrier = new Body({
            allowSleep: false,
            mass: 0,
            shape: new Plane(),
            material: this.barrierMaterial,
        });
        barrier.quaternion.setFromAxisAngle(new Vec3(1, 0, 0), Math.PI / 2);
        barrier.position.set(0, this.HEIGHT / 2 * 0.97, 0);
        this.world.addBody(barrier);

        barrier = new Body({
            allowSleep: false,
            mass: 0,
            shape: new Plane(),
            material: this.barrierMaterial,
        });
        barrier.quaternion.setFromAxisAngle(new Vec3(1, 0, 0), -Math.PI / 2);
        barrier.position.set(0, -this.HEIGHT / 2 * 0.97, 0);
        this.world.addBody(barrier);

        barrier = new Body({
            allowSleep: false,
            mass: 0,
            shape: new Plane(),
            material: this.barrierMaterial,
        });
        barrier.quaternion.setFromAxisAngle(new Vec3(0, 1, 0), -Math.PI / 2);
        barrier.position.set(this.WIDTH / 2 * 0.97, 0, 0);
        this.world.addBody(barrier);

        barrier = new Body({
            allowSleep: false,
            mass: 0,
            shape: new Plane(),
            material: this.barrierMaterial,
        });
        barrier.quaternion.setFromAxisAngle(new Vec3(0, 1, 0), Math.PI / 2);
        barrier.position.set(-this.WIDTH / 2 * 0.97, 0, 0);
        this.world.addBody(barrier);
    }

    add(...dice: DiceShape[]): void {
        dice.forEach((die) => {
            // Assign dice material for proper collision detection
            die.body.material = this.diceMaterial;
            this.world.addBody(die.body);
        });
    }

    remove(...dice: DiceShape[]): void {
        dice.forEach((die) => {
            this.world.removeBody(die.body);
        });
    }

    step(step = 1 / 60): void {
        const time = performance.now() / 1000;
        if (!this.lastCallTime) {
            this.world.step(step);
        } else {
            const dt = time - this.lastCallTime;
            this.world.step(step, dt);
        }
        this.lastCallTime = time;
    }
}
