import React from 'react';
import ReactDOM from 'react-dom/client';
import SettingsPanel from './components/SettingsPanel';
import { initBodyUI } from './utils/body-injection';
import { getContext, initSettings } from './utils/settings';
import './index.css';
import 'toastr/build/toastr.min.css';

const context = getContext();
if (context?.eventSource && context?.eventTypes) {
    context.eventSource.on(context.eventTypes.EXTENSION_SETTINGS_LOADED, initSettings);
}

const rootContainer = document.getElementById('extensions_settings');
if (rootContainer) {
    const rootElement = document.createElement('div');
    rootElement.id = '3d-dice-rolls-settings';
    rootContainer.appendChild(rootElement);

    const root = ReactDOM.createRoot(rootElement);
    root.render(
        <React.StrictMode>
            <SettingsPanel />
        </React.StrictMode>,
    );
}

initBodyUI();
