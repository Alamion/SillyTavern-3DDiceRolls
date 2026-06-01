import { memo } from 'react';
import type { DiceConfig } from '../dice-config';

interface DiceButtonProps {
    config: DiceConfig;
    primaryColor: string;
    secondaryColor: string;
    onAdd: (config: DiceConfig) => void;
    onRemove: (config: DiceConfig, e: React.MouseEvent) => void;
}

const DiceButton = memo(function DiceButton({ config, primaryColor, secondaryColor, onAdd, onRemove }: DiceButtonProps) {
    return (
        <button
            className="ddr-dice-pool-item"
            onClick={() => onAdd(config)}
            onContextMenu={(e) => onRemove(config, e)}
            title={`Left-click: Add ${config.notation} | Right-click: Remove ${config.notation}`}
            type="button"
        >
            <config.Component
                primaryColor={primaryColor}
                secondaryColor={secondaryColor}
                value={config.label}
                style={{ width: '60px', height: '60px', pointerEvents: 'none' }}
            />
        </button>
    );
});

export default DiceButton;
