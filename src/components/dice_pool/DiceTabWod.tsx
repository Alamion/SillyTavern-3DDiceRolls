import { memo, useState, useCallback } from 'react';
import { useDiceRoller } from '../DiceRollerContext';
import { handleDiceNotation } from '../../dice-logic';
import DiceButton from './DiceButton';
import { DiceD10 } from '../2d_dices';
import type { DiceConfig } from '../dice-config';

const WodTab = memo(function WodTab() {
    const [wodDifficulty, setWodDifficulty] = useState(6);
    const { settings, notationInput, setNotationInput } = useDiceRoller();

    const wodConfig: DiceConfig = {
        notation: `d10>=${wodDifficulty}`,
        Component: DiceD10,
        label: 'd10',
    };

    const onAdd = useCallback(() => {
        setNotationInput(handleDiceNotation(notationInput, `d10>=${wodDifficulty}`, true, wodDifficulty));
    }, [notationInput, wodDifficulty, setNotationInput]);

    const onRemove = useCallback((_config: DiceConfig, e: React.MouseEvent) => {
        e.preventDefault();
        setNotationInput(handleDiceNotation(notationInput, `d10>=${wodDifficulty}`, false, wodDifficulty));
    }, [notationInput, wodDifficulty, setNotationInput]);

    const decrement = useCallback(() => setWodDifficulty(d => Math.max(1, d - 1)), []);
    const increment = useCallback(() => setWodDifficulty(d => Math.min(10, d + 1)), []);

    return (
        <div className="ddr-dice-tab-body">
            <div className="ddr-dice-wod-difficulty">
                <span className="ddr-dice-wod-label">Difficulty:</span>
                <div className="ddr-dice-wod-controls">
                    <button
                        className="ddr-dice-wod-step"
                        onClick={decrement}
                        disabled={wodDifficulty <= 1}
                        type="button"
                    >
                        -
                    </button>
                    <span className="ddr-dice-wod-value">{wodDifficulty}</span>
                    <button
                        className="ddr-dice-wod-step"
                        onClick={increment}
                        disabled={wodDifficulty >= 10}
                        type="button"
                    >
                        +
                    </button>
                </div>
            </div>
            <div className="ddr-dice-pool-dice ddr-dice-wod-dice">
                <DiceButton
                    config={wodConfig}
                    primaryColor={settings.primaryDiceColor}
                    secondaryColor={settings.secondaryDiceColor}
                    onAdd={onAdd}
                    onRemove={onRemove}
                />
            </div>
        </div>
    );
});

export default WodTab;
