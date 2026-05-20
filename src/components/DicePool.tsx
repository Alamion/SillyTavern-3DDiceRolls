import { useState } from 'react';
import { DiceD4, DiceD6, DiceD8, DiceD10, DiceD12, DiceD20, DiceD100, DiceD2 } from './2d_dices';
import { debug } from '../utils/logging';
import { getSettings } from '../utils/settings';

interface DiceConfig {
    notation: string;
    Component: React.FC<{
        primaryColor: string;
        secondaryColor?: string;
        value?: number | string;
        style?: React.CSSProperties;
        className?: string;
        onClick?: () => void;
    }>;
    label: string;
}

interface DiceButtonsProps {
    onRoll: (notation: string) => void;
}

const quickDice: DiceConfig[] = [
    { notation: 'd2', Component: DiceD2, label: 'd2' },
    { notation: 'd4', Component: DiceD4, label: 'd4' },
    { notation: 'd6', Component: DiceD6, label: 'd6' },
    { notation: 'd8', Component: DiceD8, label: 'd8' },
    { notation: 'd10', Component: DiceD10, label: 'd10' },
    { notation: 'd100', Component: DiceD100, label: 'd10' },
    { notation: 'd12', Component: DiceD12, label: 'd12' },
    { notation: 'd20', Component: DiceD20, label: 'd20' },
];

const formatDicePool = (pool: string[]) => {
    const counts: Record<string, number> = {};
    pool.forEach(d => counts[d] = (counts[d] || 0) + 1);

    return Object.keys(counts)
        .sort((a, b) => +a.slice(1) - +b.slice(1))
        .map(d => counts[d] > 1 ? `${counts[d]}${d}` : d)
        .join(' + ');
};

export default function DicePool({
    onRoll,
}: DiceButtonsProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [dicePool, setDicePool] = useState<string[]>([]);

    const settings = getSettings();
    const primaryColor = settings.primaryDiceColor;
    const secondaryColor = settings.secondaryDiceColor;

    const addToPool = (notation: string) => {
        setDicePool(prev => [...prev, notation]);
    };

    const clearPool = () => {
        setDicePool([]);
    };

    const rollPool = () => {
        if (dicePool.length === 0) return;
        debug('Rolling dice pool:', dicePool);

        const notation = formatDicePool(dicePool);
        debug('Rolling notation:', notation);
        onRoll(notation);
        setDicePool([]);
    };

    const closePool = () => {
        setIsExpanded(false);
        setDicePool([]);
    };

    if (!isExpanded) {
        return (
            <div className="ddr-dice-pool-collapsed">
                <button
                    className="ddr-dice-pool-toggle ddr-ui-toggle"
                    onClick={() => setIsExpanded(true)}
                    title="Open dice pool"
                    type="button"
                >
                    <DiceD20
                        primaryColor={primaryColor}
                        secondaryColor={secondaryColor}
                        style={{ width: '48px', height: '48px' }}
                    />
                </button>
            </div>
        );
    }

    return (
        <div className="ddr-dice-pool-container">
            <div className="ddr-dice-pool-header">
                <span className="ddr-dice-pool-title">Dice Pool</span>
                <button
                    className="ddr-dice-pool-btn ddr-dice-pool-btn-close"
                    onClick={closePool}
                    title="Close dice pool"
                    type="button"
                >
                    ✕
                </button>
            </div>

            <div className="ddr-dice-pool-dice">
                {quickDice.map(({ notation, Component, label }) => (
                    <button
                        key={notation}
                        className="ddr-dice-pool-item"
                        onClick={() => addToPool(notation)}
                        title={`Add ${notation} to pool`}
                        type="button"
                    >
                        <Component
                            primaryColor={primaryColor}
                            secondaryColor={secondaryColor}
                            value={label}
                            style={{ width: '60px', height: '60px' }}
                        />
                    </button>
                ))}
            </div>

            {dicePool.length > 0 && (
                <div className="ddr-dice-pool-preview">
                    {formatDicePool(dicePool)}
                </div>
            )}

            <div className="ddr-dice-pool-actions">
                <button
                    className="ddr-dice-pool-btn ddr-dice-pool-btn-clear"
                    onClick={clearPool}
                    disabled={dicePool.length === 0}
                    title="Clear pool"
                    type="button"
                >
                    Clear
                </button>
                <button
                    className="ddr-dice-pool-btn ddr-dice-pool-btn-roll"
                    onClick={rollPool}
                    disabled={dicePool.length === 0}
                    title="Roll dice pool"
                    type="button"
                >
                    Roll{dicePool.length > 0 && ` (${dicePool.length})`}
                </button>
            </div>
        </div>
    );
}
