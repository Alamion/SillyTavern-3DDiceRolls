import { initBodyUI } from './utils/body-injection';
import { getContext, initSettings } from './utils/settings';
import './styles/index.scss';
import 'toastr/build/toastr.min.css';

const context = getContext();
if (context?.eventSource && context?.eventTypes) {
    context.eventSource.on(context.eventTypes.EXTENSION_SETTINGS_LOADED, () => {
        initSettings();
        initBodyUI();
    });
}
