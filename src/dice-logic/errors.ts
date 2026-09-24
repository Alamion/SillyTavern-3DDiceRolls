/** Notation the strict parser rejects; the message says what is wrong. */
export class NotationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'NotationError';
    }
}

export class RollCancelledError extends Error {
    constructor() {
        super('Roll cancelled by user');
        this.name = 'RollCancelledError';
    }
}
