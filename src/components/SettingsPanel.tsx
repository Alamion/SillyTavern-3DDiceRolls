import { useState, useEffect } from 'react';
import { getSettings, updateSettings, subscribeSettings, type DiceRollerSettings, getContext } from '../utils/settings';
import { SETTINGS_METADATA, type SettingType } from '../utils/constants';
import { registerFunctionTools, unregisterFunctionTools } from '../utils/function-tools';

export default function SettingsPanel(): JSX.Element {
    const [settings, setSettings] = useState<DiceRollerSettings>(getSettings());

    useEffect(() => subscribeSettings(setSettings), []);

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
        if (key === 'enableSound' || key === 'soundVolume') {
            import('../dice-logic/renderer/renderer-pool').then(({ updateSoundConfig }) => {
                updateSoundConfig({
                    ...(key === 'enableSound' ? { enabled: Boolean(value) } : {}),
                    ...(key === 'soundVolume' ? { volume: Number(value) } : {}),
                });
            });
        }
    };

    const getSettingType = (key: keyof DiceRollerSettings): SettingType => {
        return SETTINGS_METADATA[key]?.type ?? 'boolean';
    };

    const renderBooleanControl = (key: keyof DiceRollerSettings, value: unknown): JSX.Element => (
        <input type="checkbox" checked={Boolean(value)} onChange={(e) => handleChange(key, e.target.checked)} />
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
        const meta = SETTINGS_METADATA[key];
        const type = getSettingType(key);
        const value = settings[key];

        if (meta?.rangeChild) {
            const rc = meta.rangeChild;
            const childValue = settings[rc.key] as number;
            return (
                <>
                    <label className="checkbox_label">
                        {renderBooleanControl(key, value)}
                        <span>{meta.name}</span>
                    </label>
                    {Boolean(value) && (
                        <div className="alignitemscenter flex-container flexFlowColumn flexGrow flexShrink gap0 marginTop5">
                            <small>{rc.label}</small>
                            <input
                                className="neo-range-slider"
                                type="range"
                                min={rc.min}
                                max={rc.max}
                                step={rc.step}
                                value={childValue}
                                onChange={(e) => handleChange(rc.key, Number(e.target.value))}
                            />
                            <input
                                className="neo-range-input"
                                type="number"
                                min={rc.min}
                                max={rc.max}
                                step={rc.step}
                                value={childValue}
                                onChange={(e) => handleChange(rc.key, Number(e.target.value))}
                            />
                        </div>
                    )}
                </>
            );
        }

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
    const childKeys = new Set(
        Object.values(SETTINGS_METADATA)
            .filter((m) => m.rangeChild)
            .map((m) => m.rangeChild!.key),
    );
    const renderedKeys = settingKeys.filter((k) => !childKeys.has(k));

    return (
        <div className="dice-roller-settings">
            <div className="inline-drawer">
                <div className="inline-drawer-toggle inline-drawer-header">
                    <b>3D Dice Rolls</b>
                    <div
                        className="inline-drawer-icon fa-solid interactable down fa-circle-chevron-down"
                        tabIndex={0}
                    ></div>
                </div>
                <div className="inline-drawer-content">
                    {renderedKeys.map((key) => {
                        const meta = SETTINGS_METADATA[key];
                        return (
                            <div key={key} className="marginBot5">
                                {meta?.rangeChild ? (
                                    renderSettingControl(key)
                                ) : (
                                    <label className="checkbox_label">
                                        {renderSettingControl(key)}
                                        <span>{meta?.name ?? key}</span>
                                    </label>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
