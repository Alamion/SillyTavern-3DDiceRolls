import type { Body } from 'cannon-es';
import { ANGULAR_VELOCITY_THRESHOLD, REST_SECONDS, REST_WAKE_FACTOR, VELOCITY_THRESHOLD } from '../../utils/constants';

export interface RestState {
    body: Pick<Body, 'velocity' | 'angularVelocity'>;
    stopped: boolean;
    /** When the die last became still (seconds), or null while it moves. */
    restingSince: number | null;
}

/**
 * Updates whether a die has come to rest; `now` is in seconds. A die is read only after it
 * has stayed still for REST_SECONDS. Spin about the vertical axis cannot change the face that
 * is up, so only tipping spin counts. A resting die stays at rest through solver jitter in a
 * pile and wakes only when knocked (REST_WAKE_FACTOR).
 */
export function updateRestState(die: RestState, now: number): void {
    const { x: tipX, y: tipY } = die.body.angularVelocity;
    const slack = die.stopped ? REST_WAKE_FACTOR : 1;
    const still =
        die.body.velocity.length() < VELOCITY_THRESHOLD * slack &&
        Math.hypot(tipX, tipY) < ANGULAR_VELOCITY_THRESHOLD * slack;

    if (!still) {
        die.stopped = false;
        die.restingSince = null;
    } else if (die.restingSince === null) {
        die.restingSince = now;
    } else if (now - die.restingSince >= REST_SECONDS) {
        die.stopped = true;
    }
}
