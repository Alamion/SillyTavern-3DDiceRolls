import { useState, useCallback } from 'react';
import { debug } from '../../utils/logging';
import { validateNotation } from '../../dice-logic';
import { useDiceRoller } from '../DiceRollerContext';
import StandardTab from './DiceTabStandard';
import DndTab from './DiceTabDnd';
import WodTab from './DiceTabWod';

type DiceTab = 'standard' | 'dnd' | 'wod' | '';

const TABS: { id: DiceTab; label: string }[] = [
    { id: 'standard', label: 'Standard' },
    { id: 'dnd', label: 'D&D' },
    { id: 'wod', label: 'WoD' },
];

export default function DicePool() {
    const [activeTab, setActiveTab] = useState<DiceTab>('standard');
    const { notationInput, setNotationInput, roll, isFavorite, toggleFavorite } = useDiceRoller();

    const notationValid = notationInput.length === 0 || validateNotation(notationInput);
    const starred = notationInput.trim().length > 0 && isFavorite(notationInput);

    const clearNotation = useCallback(() => {
        setNotationInput('');
    }, [setNotationInput]);

    const rollNotation = useCallback(() => {
        const toRoll = notationInput.trim();
        if (!toRoll) return;
        debug('Rolling:', toRoll);
        roll(toRoll);
        setNotationInput('');
    }, [notationInput, roll, setNotationInput]);

    const canClear = notationInput.trim().length > 0;
    const canRoll = notationInput.trim().length > 0;

    return (
        <>
            <div className="ddr-dice-tabs">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        className={`ddr-dice-tab ${activeTab === tab.id ? 'ddr-dice-tab-active' : ''}`}
                        onClick={() => {
                            if (activeTab !== tab.id) {
                                setActiveTab(tab.id);
                            } else {
                                setActiveTab('');
                            }
                        }}
                        type="button"
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'standard' && <StandardTab />}
            {activeTab === 'dnd' && <DndTab />}
            {activeTab === 'wod' && <WodTab />}

            <div className="ddr-dice-custom-editor">
                <div className="ddr-dice-custom-input-wrap">
                    <input
                        type="text"
                        className={`text_pole ddr-dice-custom-input ${
                            notationInput.length > 0
                                ? notationValid
                                    ? 'ddr-dice-custom-valid'
                                    : 'ddr-dice-custom-invalid'
                                : ''
                        }`}
                        placeholder="Roll notation (e.g. 2d6+3 or 4d20kh3)"
                        value={notationInput}
                        onChange={(e) => setNotationInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && notationValid && notationInput.trim()) {
                                rollNotation();
                            }
                        }}
                    />
                    {notationInput.length > 0 && (
                        <span className={`ddr-dice-custom-status ${
                            notationValid ? 'ddr-dice-custom-status-valid' : 'ddr-dice-custom-status-invalid'
                        }`}>
                            {notationValid ? '✓' : '✗'}
                        </span>
                    )}
                    {notationInput.length > 0 && !notationValid && (
                        <a
                            href="https://dice-roller.github.io/documentation/guide/notation/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ddr-dice-custom-star"
                            title="View dice notation reference"
                        >
                            <span className="fa-regular fa-circle-question" />
                        </a>
                    )}
                    {notationInput.length > 0 && notationValid && (
                        <button
                            className={`ddr-dice-custom-star ${starred ? 'ddr-star-filled' : 'ddr-star-empty'}`}
                            onClick={() => toggleFavorite(notationInput)}
                            title={starred ? 'Remove from favorites' : 'Save as favorite'}
                            type="button"
                        >
                            <span className={`${starred ? 'fa-solid fa-star' : 'fa-regular fa-star'}`} />
                        </button>
                    )}
                </div>
                {notationInput.length > 0 && !notationValid && (
                    <span className="ddr-dice-custom-hint">Invalid notation</span>
                )}
            </div>

            <div className="ddr-dice-pool-actions">
                <button
                    className="ddr-dice-pool-btn ddr-dice-pool-btn-clear"
                    onClick={clearNotation}
                    disabled={!canClear}
                    title="Clear notation"
                    type="button"
                >
                    Clear
                </button>
                <button
                    className="ddr-dice-pool-btn ddr-dice-pool-btn-roll"
                    onClick={rollNotation}
                    disabled={!canRoll}
                    title="Roll dice"
                    type="button"
                >
                    Roll
                </button>
            </div>
        </>
    );
}
