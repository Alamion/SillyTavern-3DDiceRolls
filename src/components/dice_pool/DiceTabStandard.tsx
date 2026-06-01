import { memo, useCallback } from 'react';
import { useDiceRoller } from '../DiceRollerContext';
import { handleDiceNotation } from '../../dice-logic';
import DiceButton from './DiceButton';
import { standardDice, type DiceConfig } from '../dice-config';

const StandardTab = memo(function StandardTab() {
    const { settings, notationInput, setNotationInput } = useDiceRoller();

    const onAdd = useCallback((config: DiceConfig) => {
        setNotationInput(handleDiceNotation(notationInput, config.notation, true));
    }, [notationInput, setNotationInput]);

    const onRemove = useCallback((config: DiceConfig, e: React.MouseEvent) => {
        e.preventDefault();
        setNotationInput(handleDiceNotation(notationInput, config.notation, false));
    }, [notationInput, setNotationInput]);

    return (
        <div className="ddr-dice-tab-body">
            <div className="ddr-dice-pool-dice">
                {standardDice.map(config => (
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
        </div>
    );
});

export default StandardTab;
