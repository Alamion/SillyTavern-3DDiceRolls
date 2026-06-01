import { useState, useCallback } from 'react';
import { DiceRollerProvider } from './DiceRollerContext';
import DicePool from './dice_pool/DicePool';
import RollHistory from './RollHistory';

export default function DicePanel() {
    const [isOpen, setIsOpen] = useState(false);

    const togglePanel = useCallback(() => {
        setIsOpen(prev => !prev);
    }, []);

    return (
        <DiceRollerProvider>
            <div className="drawer-toggle">
                <button
                    className={`drawer-icon fa-solid fa-dice-d20 fa-fw interactable ${isOpen ? 'openIcon' : 'closedIcon'} drawerPinnedOpen`}
                    onClick={togglePanel}
                    title={isOpen ? 'Close dice panel' : 'Open dice panel'}
                    type="button"
                />
            </div>

            {isOpen && (
                <div id="ddr-dice-panel" className="drawer-content fillLeft openDrawer pinnedOpen">
                    <div className="ddr-dice-panel-body">
                        <DicePool />
                    </div>

                    <div className="ddr-dice-panel-divider"></div>

                    <RollHistory />
                </div>
            )}
        </DiceRollerProvider>
    );
}
