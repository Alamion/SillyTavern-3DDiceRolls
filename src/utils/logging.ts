import { MODULE_NAME } from './constants';

// Toasts use SillyTavern's own toastr (a global), so they match the app theme and the
// plugin ships no second copy. Only what the user must see or act on is toasted.

export function debug(...args: unknown[]): void {
    if (process.env.NODE_ENV !== 'production') {
        console.log(`[${MODULE_NAME}]`, ...args);
    }
}

/** Console-only warning, for conditions the user cannot act on (missing optional app features, bad payloads from other extensions). */
export function consoleWarn(message: string, title?: string, consoleArgs?: unknown[]): void {
    console.warn(`[${MODULE_NAME}]`, title ? `${title}:` : '', message, ...(consoleArgs || []));
}

export function info(message: string, title?: string, consoleArgs?: unknown[]): void {
    console.log(`[${MODULE_NAME}]`, message, ...(consoleArgs || []));

    globalThis.toastr?.success(message, title || MODULE_NAME);
}

export function warn(message: string, title?: string, consoleArgs?: unknown[]): void {
    console.warn(`[${MODULE_NAME}]`, message, ...(consoleArgs || []));

    globalThis.toastr?.warning(message, title || MODULE_NAME);
}

export function error(message: string, title?: string, consoleArgs?: unknown[]): void {
    console.error(`[${MODULE_NAME}]`, message, ...(consoleArgs || []));

    globalThis.toastr?.error(message, title || MODULE_NAME);
}
