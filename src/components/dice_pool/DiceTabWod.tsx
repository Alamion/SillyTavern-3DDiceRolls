import { memo, useCallback, useMemo } from 'react';
import { useDiceRoller } from '../DiceRollerContext';
import { handleDiceNotation, rewriteWodDifficulty } from '../../dice-logic';
import { blendColors } from '../../utils/recolor_svg';
import DiceButton from './DiceButton';
import { DiceD10 } from '../2d_dices';
import type { DiceConfig } from '../dice-config';

const CRIMSON = '#DC143C';

const WodTab = memo(function WodTab() {
    const { settings, notationInput, setNotationInput, wodDifficulty, setWodDifficulty } = useDiceRoller();

    const wodConfig: DiceConfig = useMemo(
        () => ({
            notation: `d10>=${wodDifficulty}`,
            Component: DiceD10,
            label: 'd10',
        }),
        [wodDifficulty],
    );

    const botchConfig: DiceConfig = useMemo(
        () => ({
            notation: `d10>=${wodDifficulty}f=1`,
            Component: DiceD10,
            label: 'd10',
        }),
        [wodDifficulty],
    );

    const botchPrimaryColor = useMemo(
        () => blendColors(settings.primaryDiceColor, CRIMSON, 0.5),
        [settings.primaryDiceColor],
    );

    const onAdd = useCallback(() => {
        setNotationInput(handleDiceNotation(notationInput, `d10>=${wodDifficulty}`, true, wodDifficulty));
    }, [notationInput, wodDifficulty, setNotationInput]);

    const onRemove = useCallback(
        (_config: DiceConfig, e: React.MouseEvent) => {
            e.preventDefault();
            setNotationInput(handleDiceNotation(notationInput, `d10>=${wodDifficulty}`, false, wodDifficulty));
        },
        [notationInput, wodDifficulty, setNotationInput],
    );

    const onAddBotch = useCallback(() => {
        setNotationInput(handleDiceNotation(notationInput, `d10>=${wodDifficulty}f=1`, true, wodDifficulty));
    }, [notationInput, wodDifficulty, setNotationInput]);

    const onRemoveBotch = useCallback(
        (_config: DiceConfig, e: React.MouseEvent) => {
            e.preventDefault();
            setNotationInput(handleDiceNotation(notationInput, `d10>=${wodDifficulty}f=1`, false, wodDifficulty));
        },
        [notationInput, wodDifficulty, setNotationInput],
    );

    const changeDifficulty = useCallback(
        (next: number) => {
            const bounded = Math.max(1, Math.min(10, next));
            setWodDifficulty(bounded);
            /* Terms already in the editor follow the difficulty instead of mixing thresholds. */
            setNotationInput(rewriteWodDifficulty(notationInput, bounded));
        },
        [notationInput, setNotationInput, setWodDifficulty],
    );
    const decrement = useCallback(() => changeDifficulty(wodDifficulty - 1), [changeDifficulty, wodDifficulty]);
    const increment = useCallback(() => changeDifficulty(wodDifficulty + 1), [changeDifficulty, wodDifficulty]);

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
                <DiceButton
                    config={botchConfig}
                    primaryColor={botchPrimaryColor}
                    secondaryColor={settings.secondaryDiceColor}
                    onAdd={onAddBotch}
                    onRemove={onRemoveBotch}
                />
            </div>
        </div>
    );
});

export default WodTab;
