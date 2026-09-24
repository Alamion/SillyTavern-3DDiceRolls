import { initBodyUI } from './utils/body-injection';
import { getContext, initSettings } from './utils/settings';
import './styles/index.scss';

/** Guards against a second initialization (repeated event or the script loaded twice). */
const INIT_FLAG = '__3dDiceRollsInitialized';

const context = getContext();
if (context?.eventSource && context?.eventTypes) {
    context.eventSource.on(context.eventTypes.EXTENSION_SETTINGS_LOADED, () => {
        const scope = globalThis as { [INIT_FLAG]?: boolean };
        if (scope[INIT_FLAG]) return;
        scope[INIT_FLAG] = true;
        initSettings();
        initBodyUI();
    });
}
