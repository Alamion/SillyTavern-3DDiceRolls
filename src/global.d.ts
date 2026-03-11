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
    properties: Record<string, {
        type: string;
        description: string;
    }>;
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

export interface SillyTavernContext {
    name1: string;  // user name, also encountered as {{user}}
    name2: string;  // character name, also encountered as {{char}}
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
