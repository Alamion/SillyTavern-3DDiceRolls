import { ResourceTracker } from './resource';
import { SceneManager } from './scene';
import { PhysicsWorld } from './physics';
import { DiceShape, createDiceShape } from './shapes';
import type { DiceGeometryData } from './geometries';
import { debug } from '../../utils/logging';
import { MAX_ROLL_SECONDS, VELOCITY_THRESHOLD, FRAME_RATE } from '../../utils/constants';

export interface DiceRendererConfig {
    diceColor: string
    textColor: string
    scaler: number
}

type SessionPhase =
    | 'physics'
    | 'exploding'
    | 'waiting_reroll'
    | 'arranging'
    | 'showing'
    | 'fading'
    | 'complete';

interface RollSession {
    id: number;
    dice: DiceShape[];
    phase: SessionPhase;
    groupSizes: number[];
    settleResolve: ((values: number[]) => void) | null;
    settleReject: ((err: Error) => void) | null;
    lockedIndices: Set<number>;
    iterations: number;
    currentIterations: number;
    showFrames: number;
    fadeFrames: number;
    allStopped: boolean;
    isAnimating: boolean;
    tracker: ResourceTracker;
}

export class DiceRenderer {
    private sceneManager: SceneManager;
    private physicsWorld: PhysicsWorld;
    private sessions: RollSession[] = [];
    private nextSessionId = 0;

    private readonly frameRate = FRAME_RATE;
    private readonly velocityThreshold = VELOCITY_THRESHOLD;
    private maxRollSecs = MAX_ROLL_SECONDS;

    private container: HTMLDivElement;
    private animationId: number | null = null;
    private isRunning = false;

    private width: number;
    private height: number;

    private resizeTimeout: ReturnType<typeof setTimeout> | null = null;
    private boundResizeHandler: () => void;
    private config: DiceRendererConfig;

    constructor(
        width: number,
        height: number,
        config: DiceRendererConfig,
    ) {
        this.config = config;
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
                background-color: #333333CC;
            `;
        }
        document.body.appendChild(this.container);

        this.sceneManager = new SceneManager();
        this.container.appendChild(this.sceneManager.renderer.domElement);

        this.physicsWorld = new PhysicsWorld(width, height);

        this.sceneManager.initScene(width, height);

        const camInfo = this.sceneManager.getCameraInfo();
        if (camInfo) {
            this.physicsWorld.updateBarriers(camInfo.z, camInfo.fov, camInfo.aspect);
        }

        this.width = width;
        this.height = height;

        this.boundResizeHandler = this.handleResize.bind(this);
        window.addEventListener('resize', this.boundResizeHandler);
    }

    private handleResize(): void {
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
        this.resizeTimeout = setTimeout(() => {
            const newW = window.innerWidth;
            const newH = window.innerHeight;
            this.width = newW;
            this.height = newH;
            this.container.style.width = `${newW}px`;
            this.container.style.height = `${newH}px`;
            this.physicsWorld = new PhysicsWorld(newW, newH);
            this.sceneManager.initScene(newW, newH);

            const camInfo = this.sceneManager.getCameraInfo();
            if (camInfo) {
                this.physicsWorld.updateBarriers(camInfo.z, camInfo.fov, camInfo.aspect);
            }
        }, 200);
    }

    private addDiceToScene(diceShapes: DiceShape[], tracker: ResourceTracker): void {
        for (const shape of diceShapes) {
            tracker.track(shape.geometry);
            this.sceneManager.add(shape.geometry);
            this.physicsWorld.add(shape);
        }
    }

    private removeDiceFromScene(diceShapes: DiceShape[], tracker: ResourceTracker): void {
        for (const shape of diceShapes) {
            this.sceneManager.remove(shape.geometry);
            this.physicsWorld.remove(shape);
        }
        tracker.dispose();
    }

    private getRandomVector(): { x: number; y: number } {
        return {
            x: (Math.random() * 2 - 1) * this.sceneManager.WIDTH / 2,
            y: -(Math.random() * 2 - 1) * this.sceneManager.HEIGHT / 2,
        };
    }

    private showLoading(): void {
        let el = this.container.querySelector('.ddr-loading');
        if (!el) {
            el = document.createElement('div');
            el.className = 'ddr-loading';
            (el as HTMLElement).style.setProperty('--ddr-loader-color', this.config.diceColor);
            this.container.appendChild(el);
        }
    }

    private hideLoading(): void {
        const el = this.container.querySelector('.ddr-loading');
        if (el) el.remove();
    }

    startRoll(
        diceData: DiceGeometryData[],
        groupSizes: number[],
    ): Promise<number[]> {
        debug('DiceRenderer: Starting new roll session with', diceData.length, 'dice');

        this.showLoading();

        const sessionId = this.nextSessionId++;
        const vector = this.getRandomVector();
        const diceShapes: DiceShape[] = [];

        for (const data of diceData) {
            const sides = data.values.length;
            const dice = createDiceShape(sides, this.width, this.height, data, vector);
            diceShapes.push(dice);
        }

        this.sceneManager.initCamera(diceData.length);

        const camInfo = this.sceneManager.getCameraInfo();
        if (camInfo) {
            this.physicsWorld.updateBarriers(camInfo.z, camInfo.fov, camInfo.aspect);
        }

        const tracker = new ResourceTracker();
        this.addDiceToScene(diceShapes, tracker);

        let settleResolve: ((values: number[]) => void) | null = null;
        let settleReject: ((err: Error) => void) | null = null;
        const settlePromise = new Promise<number[]>((resolve, reject) => {
            settleResolve = resolve;
            settleReject = reject;
        });

        const session: RollSession = {
            id: sessionId,
            dice: diceShapes,
            phase: 'physics',
            groupSizes,
            settleResolve,
            settleReject,
            lockedIndices: new Set(),
            iterations: 0,
            currentIterations: 0,
            showFrames: 60,
            fadeFrames: 60,
            allStopped: false,
            isAnimating: true,
            tracker,
        };

        this.sessions.push(session);

        if (!this.isRunning) {
            this.isRunning = true;
            this.animate();
        }

        return settlePromise;
    }

    lockDice(flatIndices: number[]): void {
        const activeSession = this.sessions[this.sessions.length - 1];
        if (!activeSession) return;
        for (const idx of flatIndices) {
            activeSession.lockedIndices.add(idx);
            const die = activeSession.dice[idx];
            if (die) {
                die.body.velocity.set(0, 0, 0);
                die.body.angularVelocity.set(0, 0, 0);
                die.body.updateMassProperties();
            }
        }
    }

    rethrowDice(flatIndices: number[]): Promise<number[]> {
        const activeSession = this.sessions[this.sessions.length - 1];
        if (!activeSession) {
            return Promise.reject(new Error('No active session'));
        }

        for (const idx of flatIndices) {
            activeSession.lockedIndices.delete(idx);
            const die = activeSession.dice[idx];
            if (die) {
                const vector = this.getRandomVector();
                die.recreate(vector, this.width, this.height);
            }
        }

        let settleResolve: ((values: number[]) => void) | null = null;
        let settleReject: ((err: Error) => void) | null = null;
        const settlePromise = new Promise<number[]>((resolve, reject) => {
            settleResolve = resolve;
            settleReject = reject;
        });

        activeSession.settleResolve = settleResolve;
        activeSession.settleReject = settleReject;
        activeSession.phase = 'waiting_reroll';
        activeSession.allStopped = false;
        activeSession.currentIterations = 0;

        return settlePromise;
    }

    addDice(extraDiceData: DiceGeometryData[]): Promise<number[]> {
        const activeSession = this.sessions[this.sessions.length - 1];
        if (!activeSession) {
            return Promise.reject(new Error('No active session'));
        }

        const startIndex = activeSession.dice.length;
        const vector = this.getRandomVector();
        const newDice: DiceShape[] = [];

        for (const data of extraDiceData) {
            const sides = data.values.length;
            const dice = createDiceShape(sides, this.width, this.height, data, vector);
            newDice.push(dice);
        }

        this.addDiceToScene(newDice, activeSession.tracker);
        activeSession.dice.push(...newDice);

        let settleResolve: ((values: number[]) => void) | null = null;
        let settleReject: ((err: Error) => void) | null = null;
        const settlePromise = new Promise<number[]>((resolve, reject) => {
            settleResolve = (values) => resolve(values.slice(startIndex));
            settleReject = reject;
        });

        activeSession.settleResolve = settleResolve;
        activeSession.settleReject = settleReject;
        activeSession.phase = 'exploding';
        activeSession.allStopped = false;
        activeSession.currentIterations = 0;

        return settlePromise;
    }

    readFlatValues(): number[] {
        const activeSession = this.sessions[this.sessions.length - 1];
        if (!activeSession) return [];
        return activeSession.dice.map(d => d.result);
    }

    arrangeAndDismiss(): void {
        const activeSession = this.sessions[this.sessions.length - 1];
        if (!activeSession) return;

        activeSession.phase = 'arranging';
    }

    private resolveSettle(session: RollSession): void {
        const values = session.dice.map(d => d.result);
        if (session.settleResolve) {
            session.settleResolve(values);
            session.settleResolve = null;
            session.settleReject = null;
        }
    }

    private completeSession(session: RollSession): void {
        debug(`DiceRenderer: Completing session ${session.id} after ${session.iterations} iterations`);

        this.hideLoading();

        session.isAnimating = false;

        const results = session.dice.map(d => d.result);

        if (session.settleResolve) {
            session.settleResolve(results);
            session.settleResolve = null;
            session.settleReject = null;
        }

        this.removeDiceFromScene(session.dice, session.tracker);

        this.sceneManager.render();

        this.sessions = this.sessions.filter(s => s.id !== session.id);

        if (this.sessions.length === 0) {
            this.stopAnimationLoop();
        }
    }

    private stopAnimationLoop(): void {
        this.isRunning = false;
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    private animate(): void {
        if (!this.isRunning) return;

        for (const session of this.sessions) {
            if (!session.isAnimating) continue;

            switch (session.phase) {
                case 'physics':
                case 'exploding':
                case 'waiting_reroll':
                    if (this.checkRollFinished(session)) {
                        session.allStopped = true;
                        this.resolveSettle(session);
                        session.phase = session.phase === 'physics' ? 'showing' : 'arranging';
                    }
                    break;

                case 'arranging':
                    this.resolveSettle(session);
                    session.phase = 'showing';
                    break;

                case 'showing':
                    if (session.allStopped) {
                        session.showFrames--;
                        if (session.showFrames <= 0) {
                            session.phase = 'fading';
                        }
                    } else if (this.checkRollFinished(session)) {
                        session.allStopped = true;
                        this.resolveSettle(session);
                    }
                    break;

                case 'fading':
                    if (session.fadeFrames > 0) {
                        const progress = session.fadeFrames / 60;
                        const easeOut = 1 - Math.pow(1 - progress, 3);
                        for (const die of session.dice) {
                            die.setOpacity(easeOut);
                        }
                        session.fadeFrames--;
                    } else {
                        this.completeSession(session);
                        continue;
                    }
                    break;

                case 'complete':
                    this.completeSession(session);
                    continue;
            }

            session.iterations++;
            session.currentIterations++;

            for (const die of session.dice) {
                die.set();
            }
        }

        if (this.sessions.length > 0) {
            this.physicsWorld.step(this.frameRate);
            this.sceneManager.render();
            this.animationId = requestAnimationFrame(() => this.animate());
        } else {
            this.stopAnimationLoop();
        }
    }

    private checkRollFinished(session: RollSession): boolean {
        let allStoppedNow = true;

        for (let i = 0; i < session.dice.length; i++) {
            const die = session.dice[i];

            if (session.lockedIndices.has(i)) {
                die.body.velocity.set(0, 0, 0);
                die.body.angularVelocity.set(0, 0, 0);
                continue;
            }

            if (session.currentIterations > this.maxRollSecs / this.frameRate) {
                debug(`Session ${session.id}: Animation timeout for die ${i}`);
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
                if (session.iterations - die.staleIterations > 5) {
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

    dispose(): void {
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
        window.removeEventListener('resize', this.boundResizeHandler);
        for (const session of this.sessions) {
            this.removeDiceFromScene(session.dice, session.tracker);
        }
        this.sessions = [];
        this.stopAnimationLoop();
        this.sceneManager.dispose();
        this.container.remove();
    }
}
