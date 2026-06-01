import { memo, useCallback } from 'react';
import { useDiceRoller } from '../DiceRollerContext';
import { handleDiceNotation, applyAdvantage, applyDisadvantage } from '../../dice-logic';
import DiceButton from './DiceButton';
import { dndDice, type DiceConfig } from '../dice-config';

const DndTab = memo(function DndTab() {
    const { settings, notationInput, setNotationInput } = useDiceRoller();

    const onAdd = useCallback((config: DiceConfig) => {
        setNotationInput(handleDiceNotation(notationInput, config.notation, true));
    }, [notationInput, setNotationInput]);

    const onRemove = useCallback((config: DiceConfig, e: React.MouseEvent) => {
        e.preventDefault();
        setNotationInput(handleDiceNotation(notationInput, config.notation, false));
    }, [notationInput, setNotationInput]);

    const handleAdv = useCallback(() => {
        setNotationInput(applyAdvantage(notationInput));
    }, [notationInput, setNotationInput]);

    const handleDis = useCallback(() => {
        setNotationInput(applyDisadvantage(notationInput));
    }, [notationInput, setNotationInput]);

    return (
        <div className="ddr-dice-tab-body">
            <div className="ddr-dice-pool-dice">
                {dndDice.map(config => (
                    <DiceButton
                        key={config.notation}
                        config={config}
                        primaryColor={settings.primaryDiceColor}
                        secondaryColor={settings.secondaryDiceColor}
                        onAdd={onAdd}
                        onRemove={onRemove}
                    />
                ))}
            </div>
            <div className="ddr-dice-adv-section">
                <div className="ddr-dice-adv-actions">
                    <button
                        className="ddr-dice-pool-btn ddr-dice-adv-btn"
                        onClick={handleAdv}
                        title="Apply advantage to first d20"
                        type="button"
                    >
                        ADV
                    </button>
                    <button
                        className="ddr-dice-pool-btn ddr-dice-adv-btn"
                        onClick={handleDis}
                        title="Apply disadvantage to first d20"
                        type="button"
                    >
                        DIS
                    </button>
                </div>
            </div>
        </div>
    );
});

export default DndTab;
