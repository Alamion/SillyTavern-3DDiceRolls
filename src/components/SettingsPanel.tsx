import { useState, useEffect } from 'react';
import { getSettings, updateSettings, type DiceRollerSettings, getContext } from '../utils/settings';
import { SETTINGS_METADATA, type SettingType } from '../utils/constants';
import { registerFunctionTools, unregisterFunctionTools } from '../utils/function-tools';

export default function SettingsPanel(): JSX.Element {
    const [settings, setSettings] = useState<DiceRollerSettings>(getSettings());

    useEffect(() => {
        const interval = setInterval(() => {
            const currentSettings = getSettings();
            if (JSON.stringify(currentSettings) !== JSON.stringify(settings)) {
                setSettings(currentSettings);
            }
        }, 100);
        return () => clearInterval(interval);
    }, [settings]);

    const handleChange = (key: keyof DiceRollerSettings, value: boolean | string | number): void => {
        updateSettings({ [key]: value });
        setSettings(getSettings());
        const context = getContext();
        if (context?.saveSettingsDebounced) {
            context.saveSettingsDebounced();
        }
        if (key === 'functionTool' && typeof value === 'boolean') {
            if (value) {
                registerFunctionTools();
            } else {
                unregisterFunctionTools();
            }
        }
    };

    const getSettingName = (key: keyof DiceRollerSettings): string => {
        return SETTINGS_METADATA[key]?.name ?? key;
    };

    const getSettingType = (key: keyof DiceRollerSettings): SettingType => {
        return SETTINGS_METADATA[key]?.type ?? 'boolean';
    };

    const renderBooleanControl = (key: keyof DiceRollerSettings, value: unknown): JSX.Element => (
        <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => handleChange(key, e.target.checked)}
        />
    );

    const renderStringControl = (key: keyof DiceRollerSettings, value: unknown): JSX.Element => (
        <input
            type="text"
            value={String(value)}
            onChange={(e) => handleChange(key, e.target.value)}
            className="text_pole"
        />
    );

    const renderNumberControl = (key: keyof DiceRollerSettings, value: unknown): JSX.Element => (
        <input
            type="number"
            value={Number(value)}
            onChange={(e) => handleChange(key, Number(e.target.value))}
            className="text_pole"
        />
    );

    const renderColorControl = (key: keyof DiceRollerSettings, value: unknown): JSX.Element => (
        <div className="color-picker">
            <input
                type="color"
                value={String(value)}
                onChange={(e) => handleChange(key, e.target.value)}
                className="color-input"
                title="Select Color"
            />
        </div>
    );

    const renderSettingControl = (key: keyof DiceRollerSettings): JSX.Element | null => {
        const type = getSettingType(key);
        const value = settings[key];

        switch (type) {
            case 'boolean':
                return renderBooleanControl(key, value);
            case 'string':
                return renderStringControl(key, value);
            case 'number':
                return renderNumberControl(key, value);
            case 'color':
                return renderColorControl(key, value);
            default:
                return null;
        }
    };

    const settingKeys = Object.keys(settings) as Array<keyof DiceRollerSettings>;

    return (
        <div className="dice-roller-settings">
            <div className="inline-drawer">
                <div className="inline-drawer-toggle inline-drawer-header">
                    <b>3D Dice Rolls</b>
                    <div className="inline-drawer-icon fa-solid interactable up fa-circle-chevron-up" tabIndex={0}></div>
                </div>
                <div className="inline-drawer-content">
                    {settingKeys.map((key) => (
                        <div key={key} className="marginBot5">
                            <label className="checkbox_label">
                                {renderSettingControl(key)}
                                <span>{getSettingName(key)}</span>
                            </label>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
