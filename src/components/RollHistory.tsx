import { useState, useCallback, useRef, useEffect } from 'react';
import type { RollResult } from '../dice-logic';
import {DiceD12} from "./2d_dices";
import {getSettings} from "../utils/settings";

interface RollHistoryProps {
  rolls: RollResult[];
  onClear: () => void;
}

export default function RollHistory({
    rolls,
    onClear,
}: RollHistoryProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    const clearHistory = useCallback(() => {
        onClear();
    }, [onClear]);

    const closeHistory = useCallback(() => {
        setIsExpanded(false);
    }, []);

    // Auto-scroll to bottom (latest) when rolls change
    useEffect(() => {
        if (contentRef.current && isExpanded) {
            contentRef.current.scrollTop = contentRef.current.scrollHeight;
        }
    }, [rolls, isExpanded]);

    const settings = getSettings();

    if (!isExpanded) {
        return (
            <div className="roll-history-collapsed">
                <button
                    className="roll-history-toggle"
                    onClick={() => setIsExpanded(true)}
                    title={`Open roll history (${rolls.length} rolls)`}
                    type="button"
                >
                    <DiceD12
                        primaryColor={settings.primaryDiceColor}
                        secondaryColor={settings.secondaryDiceColor}
                        style={{ width: '48px', height: '48px' }}
                    />
                    {rolls.length > 0 && (
                        <span className="roll-history-badge">{rolls.length}</span>
                    )}
                </button>
            </div>
        );
    }

    const displayRolls = rolls.slice(0, 10);

    return (
        <div className="roll-history-container">
            {displayRolls.length > 0 && (
                <div className="roll-history-content" ref={contentRef}>
                    {displayRolls.map((roll, idx) => {
                        const isLatest = idx === 0;
                        return (
                            <div
                                key={`${roll.notation}-${idx}`}
                                className={`roll-history-item ${isLatest ? 'latest' : ''}`}
                            >
                                <div>
                                    <span className="roll-history-notation">{roll.notation}</span>
                                    <span className="roll-history-total"> = {roll.total}</span>
                                </div>
                                {isLatest && roll.diceGroups &&
                                (roll.diceGroups.length > 1 ||
                                    (roll.diceGroups[0]?.rolls && roll.diceGroups[0]?.rolls.length > 1)) && (
                                    <span className="roll-history-dice">{roll.details}</span>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {displayRolls.length === 0 && (
                <div className="roll-history-empty">
                    No rolls yet
                </div>
            )}

            <div className="roll-history-actions">
                <button
                    className="roll-history-btn roll-history-btn-clear"
                    onClick={clearHistory}
                    disabled={rolls.length === 0}
                    title="Clear history"
                    type="button"
                >
                    Clear
                </button>
            </div>

            <div className="roll-history-header">
                <span className="roll-history-title">Roll History</span>
                <button
                    className="roll-history-btn roll-history-btn-close"
                    onClick={closeHistory}
                    title="Close history"
                    type="button"
                >
                    ✕
                </button>
            </div>
        </div>
    );
}
