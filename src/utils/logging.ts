import { MODULE_NAME } from './constants';
import * as toastr from 'toastr';

export function debug(...args: unknown[]): void {
    if (process.env.NODE_ENV !== 'production') {
        console.log(`[${MODULE_NAME}]`, ...args);
    }
}

export function info(message: string, title?: string, consoleArgs?: unknown[]): void {
    console.log(`[${MODULE_NAME}]`, message, ...(consoleArgs || []));

    toastr.success(message, title || MODULE_NAME);
}

export function warn(message: string, title?: string, consoleArgs?: unknown[]): void {
    console.warn(`[${MODULE_NAME}]`, message, ...(consoleArgs || []));

    toastr.warning(message, title || MODULE_NAME);
}

export function error(message: string, title?: string, consoleArgs?: unknown[]): void {
    console.error(`[${MODULE_NAME}]`, message, ...(consoleArgs || []));

    toastr.error(message, title || MODULE_NAME);
}
