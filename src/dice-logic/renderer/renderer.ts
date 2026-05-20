import { ResourceTracker } from './resource';
import { SceneManager } from './scene';
import { PhysicsWorld } from './physics';
import { DiceShape, createDiceShape } from './shapes';
import type { DiceGeometryData } from './geometries';
import { debug } from '../../utils/logging';

export interface DiceRendererConfig {
    diceColor: string
    textColor: string
    scaler: number
}

export type RollCompleteCallback = (results: number[]) => void

export class DiceRenderer {
    private sceneManager: SceneManager;
    private physicsWorld: PhysicsWorld;
    private tracker = new ResourceTracker();
    private dice: DiceShape[] = [];
    private isAnimating = false;
    private animationId: number | null = null;
    private iterations = 0;
    private onComplete: RollCompleteCallback | null = null;

    private readonly frameRate = 1 / 60;
    private readonly velocityThreshold = 5;
    private allStopped = false;
    private maxRollSecs = 10;
    private showFrames = 60;
    private fadeFrames = 60;

    private container: HTMLDivElement;

    private width: number;
    private height: number;

    constructor(
        width: number,
        height: number,
        _config: DiceRendererConfig,
    ) {
        debug('DiceRenderer: Creating renderer with dimensions', width, height);
        this.container = document.createElement('div');
        this.container.className = 'ddr-dice-renderer-container';
        this.container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: ${width}px;
            height: ${height}px;
            pointer-events: none;
            z-index: 9999;
        `;
        const isDevelopment = process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== undefined;
        if (isDevelopment) {
            this.container.style.cssText += `
                background-color: #333333;
            `;
        }
        document.body.appendChild(this.container);
        debug('DiceRenderer: Container created and appended to body');

        this.sceneManager = new SceneManager();
        this.container.appendChild(this.sceneManager.renderer.domElement);
        debug('DiceRenderer: SceneManager created, canvas appended');

        this.physicsWorld = new PhysicsWorld(
            width,
            height,
        );
        debug('DiceRenderer: PhysicsWorld created');

        this.sceneManager.initScene(width, height);
        debug('DiceRenderer: Scene initialized with dimensions', width, height);

        this.width = width;
        this.height = height;
    }

    addDice(diceShapes: DiceShape[]): void {
        for (const shape of diceShapes) {
            this.tracker.track(shape.geometry);
            this.sceneManager.add(shape.geometry);
            this.physicsWorld.add(shape);
            this.dice.push(shape);
        }
    }

    roll(diceData: DiceGeometryData[], onComplete: RollCompleteCallback): void {
        debug('DiceRenderer: Starting roll with', diceData.length, 'dice');
        if (this.isAnimating) {
            this.stop();
        }

        this.onComplete = onComplete;
        this.clearDice();

        const vector = this.getRandomVector();

        const diceShapes: DiceShape[] = [];

        for (const data of diceData) {
            const sides = data.values.length;
            const dice = createDiceShape(
                sides,
                this.width,
                this.height,
                data,
                vector,
            );

            diceShapes.push(dice);
        }

        this.addDice(diceShapes);
        debug('DiceRenderer: Added', diceShapes.length, 'dice to scene');
        this.start();
    }

    private reportDice(): void {
        const die = this.dice[0];
        debug(`Frame ${this.iterations}: Die pos=(${die.body.position.x.toFixed(1)}, ${die.body.position.y.toFixed(1)}, ${die.body.position.z.toFixed(1)}), vel=${die.body.velocity.length().toFixed(1)}, angVel=${die.body.angularVelocity.length().toFixed(1)}, quaternion=${die.body.quaternion.x.toFixed(1)}, ${die.body.quaternion.y.toFixed(1)}, ${die.body.quaternion.z.toFixed(1)}, ${die.body.quaternion.w.toFixed(1)}`);
    }

    private start(): void {
        this.isAnimating = true;
        this.iterations = 0;
        this.showFrames = 60;
        this.allStopped = false;
        this.fadeFrames = 60;
        this.container.style.opacity = '1';
        debug('DiceRenderer: Animation started');
        this.animate();
    }

    private stop(): void {
        debug('DiceRenderer: Animation stopped after', this.iterations, 'iterations');
        this.isAnimating = false;
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        if (this.onComplete) {
            const results = this.dice.map((d) => d.result);
            debug('DiceRenderer: Roll complete with results:', results);
            this.onComplete(results);
            this.onComplete = null;
        }
    }

    private animate(): void {
        if (!this.isAnimating) return;

        if (this.allStopped || this.checkRollFinished()) {
            this.allStopped = true;
            if (this.showFrames > 0) {
                this.showFrames--;
            } else if (this.fadeFrames > 0) {
                const progress = this.fadeFrames / 60;
                const easeOut = 1 - Math.pow(1 - progress, 3);
                this.container.style.opacity = easeOut.toString();
                this.fadeFrames--;
            } else {
                this.stop();
                setTimeout(() => this.dispose(), 1000);
                return;
            }
        }

        this.animationId = requestAnimationFrame(() => this.animate());

        this.physicsWorld.step(this.frameRate);
        this.iterations++;

        for (const die of this.dice) {
            die.set();
        }

        // Check every 60 frames if all dice have stopped moving (velocity < 1)
        if (this.iterations % 60 === 0 && this.dice.length > 0) {
            if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== undefined) {
                this.reportDice();
            }
        }

        this.sceneManager.render();
    }

    private checkRollFinished(): boolean {
        let allStoppedNow = true;

        for (const die of this.dice) {
            if (this.iterations > this.maxRollSecs / this.frameRate) {
                debug('Animation timeout for die');
                die.stopped = true;
                continue;
            }

            const a = die.body.angularVelocity;
            const v = die.body.velocity;

            if (
                a.length() < this.velocityThreshold &&
                v.length() < this.velocityThreshold
            ) {
                die.staleIterations++;
                if (this.iterations - die.staleIterations > 5) {
                    die.stopped = true;
                }
            } else {
                die.stopped = false;
                die.staleIterations = 0;
            }

            if (!die.stopped) {
                allStoppedNow = false;
            }
        }

        return allStoppedNow;
    }

    private getRandomVector(): { x: number; y: number } {
        debug('DiceRenderer: Generating random vector from', this.width, this.height);
        return {
            x: (Math.random() * 2 - 1) * this.sceneManager.WIDTH / 2,
            y: -(Math.random() * 2 - 1) * this.sceneManager.HEIGHT / 2,
        };
    }

    private clearDice(): void {
        for (const die of this.dice) {
            this.sceneManager.remove(die.geometry);
            this.physicsWorld.remove(die);
        }
        this.dice = [];
        this.tracker.dispose();
    }

    dispose(): void {
        this.stop();
        this.clearDice();
        this.sceneManager.dispose();
        this.container.remove();
    }
}
