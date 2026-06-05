import { memo, useRef, useEffect } from 'react';
import { useDiceRoller } from './DiceRollerContext';

const TABS = [
    { id: 'chat' as const, label: 'Chat' },
    { id: 'favorites' as const, label: 'Favorites' },
    { id: 'recent' as const, label: 'Recent' },
];

interface ListItem {
    key: string;
    notation: string;
    total?: number;
    isStarred?: boolean;
    onToggleStar?: () => void;
    onBodyClick?: () => void;
    isExpanded?: boolean;
    details?: string;
    formatted?: string;
}

function RollHistory() {
    const {
        history,
        favorites,
        recentNotations,
        expandedIds,
        activeTab,
        setActiveTab,
        setNotationInput,
        toggleFavorite,
        isFavorite,
        roll,
        toggleExpand,
        clearHistory,
    } = useDiceRoller();

    const contentRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (contentRef.current && activeTab === 'chat') {
            contentRef.current.scrollTop = contentRef.current.scrollHeight;
        }
    }, [history, activeTab]);

    const renderItemRow = (item: ListItem) => (
        <div key={item.key} className={`ddr-roll-history-item${item.isExpanded ? ' latest expanded' : ''}`}>
            <div className="ddr-roll-history-row">
                {item.onToggleStar ? (
                    <button
                        className="ddr-roll-history-star"
                        onClick={(e) => {
                            e.stopPropagation();
                            item.onToggleStar!();
                        }}
                        title={item.isStarred ? 'Remove from favorites' : 'Add to favorites'}
                        type="button"
                    >
                        <span className={`ddr-star-icon ${item.isStarred ? 'ddr-star-filled' : 'ddr-star-empty'}`}>
                            <span className={`${item.isStarred ? 'fa-solid fa-star' : 'fa-regular fa-star'}`} />
                        </span>
                    </button>
                ) : null}
                <button
                    onClick={item.onBodyClick}
                    title="Click to set notation & toggle details"
                    className="ddr-roll-history-body"
                    type="button"
                >
                    <span className="ddr-roll-history-notation">{item.notation}</span>
                    {item.total != null && <span className="ddr-roll-history-total"> = {item.total}</span>}
                </button>
                <button
                    className="ddr-roll-history-reroll"
                    onClick={(e) => {
                        e.stopPropagation();
                        setNotationInput(item.notation);
                    }}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        roll(item.notation);
                    }}
                    title="Set notation | Right-click to roll"
                    type="button"
                >
                    <span className="fa-solid fa-rotate-right" />
                </button>
            </div>
            {item.isExpanded && item.details != null && (
                <div className="ddr-roll-history-dice">
                    Rolls: {item.details}
                    <br />
                    Formatted: {item.formatted}
                </div>
            )}
        </div>
    );

    const renderList = (items: ListItem[], emptyMsg: string, scrollRef?: React.Ref<HTMLDivElement>) => {
        if (items.length === 0) {
            return <div className="ddr-roll-history-empty">{emptyMsg}</div>;
        }
        return (
            <div className="ddr-roll-history-content" ref={scrollRef ?? undefined}>
                {items.map(renderItemRow)}
            </div>
        );
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'chat':
                return renderList(
                    history.map((entry) => ({
                        key: entry.id,
                        notation: entry.result.notation,
                        total: entry.result.total,
                        isStarred: isFavorite(entry.result.notation),
                        onToggleStar: () => toggleFavorite(entry.result.notation),
                        onBodyClick: () => toggleExpand(entry.id),
                        isExpanded: expandedIds.includes(entry.id),
                        details: entry.result.details,
                        formatted: entry.result.formatted,
                    })),
                    'No rolls yet',
                    contentRef,
                );
            case 'favorites':
                return renderList(
                    favorites.map((fav) => ({
                        key: fav.id,
                        notation: fav.notation,
                        isStarred: true,
                        onToggleStar: () => toggleFavorite(fav.notation),
                    })),
                    'No favorites saved',
                );
            case 'recent':
                return renderList(
                    recentNotations.map((notation, idx) => ({
                        key: `${notation}-${idx}`,
                        notation,
                    })),
                    'No recent notations',
                );
            default:
                return <></>;
        }
    };

    return (
        <div className="ddr-roll-section">
            <div className="ddr-roll-section-header">
                <div className="ddr-roll-tabs">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            className={`ddr-roll-tab ${activeTab === tab.id ? 'ddr-roll-tab-active' : ''}`}
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
                {activeTab === 'chat' && (
                    <button
                        className="ddr-roll-section-btn-clear"
                        onClick={clearHistory}
                        disabled={history.length === 0}
                        title="Clear history"
                        type="button"
                    >
                        Clear
                    </button>
                )}
            </div>
            {renderTabContent()}
        </div>
    );
}

export default memo(RollHistory);
