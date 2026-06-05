export interface ChatMessage {
    name?: string;
    mes?: string;
    title?: string;
    gen_started?: MessageTimestamp;
    gen_finished?: MessageTimestamp;
    send_date?: MessageTimestamp;
    is_user?: boolean;
    is_system?: boolean;
    force_avatar?: string;
    original_avatar?: string;
    swipes?: string[];
    swipe_info?: SwipeInfo[];
    swipe_id?: number;
    extra?: ChatMessageExtra;
}

export interface FunctionToolSchema {
    $schema: string;
    type: string;
    properties: Record<
        string,
        {
            type: string;
            description: string;
        }
    >;
    required: string[];
}

export interface FunctionTool {
    name: string;
    displayName: string;
    description: string;
    parameters: FunctionToolSchema;
    action: (args: Record<string, unknown>) => Promise<unknown>;
    formatMessage: () => string;
}

export interface MacroRegistrationOptions {
    description?: string;
    category?: string;
    returns?: string;
    returnType?: string;
    exampleUsage?: string[];
    unnamedArgs?: { name: string; description: string; sampleValue?: string; type?: string }[];
    handler: (ctx: {
        unnamedArgs: string[];
        args?: string[];
        env?: unknown;
        resolve?: (text: string) => string;
    }) => string;
}

export interface MacrosAPI {
    register: (name: string, options: MacroRegistrationOptions) => void;
    registerAlias: (name: string, alias: string, options?: { visible?: boolean }) => void;
    registry: {
        unregisterMacro: (name: string) => void;
    };
    category: {
        /** Basic utilities and text manipulation (newline, noop, trim, reverse, comment) */
        UTILITY: 'utility';
        /** Randomization and dice rolling (random, pick, roll) */
        RANDOM: 'random';
        /** Participant names and name lists (user, char, group, notChar) */
        NAMES: 'names';
        /** Character card fields and persona (description, personality, scenario, mesExamples, persona) */
        CHARACTER: 'character';
        /** Chat history, messages, and swipes */
        CHAT: 'chat';
        /** Date, time, and duration macros */
        TIME: 'time';
        /** Local and global variable operations */
        VARIABLE: 'variable';
        /** Prompt templates for text completion (instruct sequences, system prompts, author's notes, context templates) */
        PROMPTS: 'prompts';
        /** Runtime application state (model, API, lastGenerationType, isMobile) */
        STATE: 'state';
        /** Macros that don't fit in any of the other categories, but don't really need/deserve their own */
        MISC: 'misc';
        /** Macros that are registered but not assigned to a category (any macro should have a category, so let the extension author know...) */
        UNCATEGORIZED: 'uncategorized';
    };
}

export interface SillyTavernContext {
    name1: string; // user name, also encountered as {{user}}
    name2: string; // character name, also encountered as {{char}}
    macros: MacrosAPI;
    characters: unknown[];
    activeCharacter: unknown;
    extensionSettings: Record<string, Record<string, unknown>>;
    settings: Record<string, unknown>;
    saveSettingsDebounced?: () => void;
    writeExtensionField?: (module: string, field: string, value: unknown) => void;
    registerFunctionTool?: (tool: FunctionTool) => void;
    unregisterFunctionTool?: (name: string) => void;
    chat?: {
        textInput: HTMLTextAreaElement | null;
    };
    api?: {
        emit: (event: string, data: unknown) => void;
    };
    eventSource: {
        on: (event: string, callback: (...args: unknown[]) => void) => void;
        off: (event: string, callback: (...args: unknown[]) => void) => void;
    };
    eventTypes: {
        EXTENSION_SETTINGS_LOADED: string;
        CHAT_CHANGED: string;
        [key: string]: string;
    };
    chatMetadata: Record<string, unknown>;
    updateChatMetadata: (values: Record<string, unknown>) => void;
    saveMetadata: () => Promise<void>;
    SlashCommand: {
        fromProps: (props: Record<string, unknown>) => Record<string, unknown>;
    };
    SlashCommandParser?: {
        addCommandObject: (command: SlashCommand) => void;
    };
    SlashCommandArgument?: {
        fromProps: (props: Record<string, unknown>) => Record<string, unknown>;
    };
    SlashCommandNamedArgument?: {
        fromProps: (props: Record<string, unknown>) => Record<string, unknown>;
    };
    ARGUMENT_TYPE: {
        [key: string]: string;
    };
    isToolCallingSupported: () => boolean;
    addOneMessage: (message: ChatMessage, options?: Record<string, unknown>) => JQuery<HTMLElement>;
    sendSystemMessage: (type: string, text?: string, extra?: Record<string, unknown>) => void;
}

export interface SillyTavernAPI {
    getContext: () => SillyTavernContext;
}

declare global {
    var SillyTavern: SillyTavernAPI;
}

export {};
