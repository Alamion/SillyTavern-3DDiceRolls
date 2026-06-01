import { memo, useRef, useEffect } from 'react';
import { useDiceRoller } from './DiceRollerContext';

const TABS = [
    { id: 'chat' as const, label: 'Chat' },
    { id: 'favorites' as const, label: 'Favorites' },
    { id: 'recent' as const, label: 'Recent' },
];

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

    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (contentRef.current && activeTab === 'chat') {
            contentRef.current.scrollTop = contentRef.current.scrollHeight;
        }
    }, [history, activeTab]);

    /* ─── "Chat" tab render ─── */
    const renderChatTab = () => {
        const display = history;
        if (display.length === 0) {
            return <div className="ddr-roll-history-empty">No rolls yet</div>;
        }
        return (
            <div className="ddr-roll-history-content" ref={contentRef}>
                {display.map((entry) => {
                    const isExpanded = expandedIds.includes(entry.id);
                    const starred = isFavorite(entry.result.notation);
                    return (
                        <div
                            key={entry.id}
                            className={`ddr-roll-history-item${isExpanded ? ' latest expanded' : ''}`}
                        >
                            <div className="ddr-roll-history-row">
                                <button
                                    className="ddr-roll-history-star"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleFavorite(entry.result.notation);
                                    }}
                                    title={starred ? 'Remove from favorites' : 'Add to favorites'}
                                    type="button"
                                >
                                    <span className={`ddr-star-icon ${starred ? 'ddr-star-filled' : 'ddr-star-empty'}`}>
                                        <span className={`${starred ? 'fa-solid fa-star' : 'fa-regular fa-star'}`} />
                                    </span>
                                </button>
                                <button
                                    onClick={() => toggleExpand(entry.id)}
                                    title="Click to set notation & toggle details"
                                    className="ddr-roll-history-body"
                                    type="button"
                                >
                                    <span className="ddr-roll-history-notation">{entry.result.notation}</span>
                                    <span className="ddr-roll-history-total"> = {entry.result.total}</span>
                                </button>
                                <button
                                    className="ddr-roll-history-reroll"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setNotationInput(entry.result.notation);
                                    }}
                                    onContextMenu={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        roll(entry.result.notation);
                                    }}
                                    title="Set notation | Right-click to roll"
                                    type="button"
                                >
                                    <span className="fa-solid fa-rotate-right" />
                                </button>
                            </div>
                            {isExpanded && (
                                <div className="ddr-roll-history-dice">{entry.result.details}</div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    /* ─── "Favorites" tab render ─── */
    const renderFavoritesTab = () => {
        if (favorites.length === 0) {
            return <div className="ddr-roll-history-empty">No favorites saved</div>;
        }
        return (
            <div className="ddr-roll-history-content">
                {favorites.map((fav) => (
                    <div key={fav.id} className="ddr-roll-history-item">
                        <div className="ddr-roll-history-row">
                            <button
                                className="ddr-roll-history-star"
                                onClick={() => toggleFavorite(fav.notation)}
                                title="Remove from favorites"
                                type="button"
                            >
                                <span className="ddr-star-icon ddr-star-filled"><span className="fa-solid fa-star" /></span>
                            </button>
                            <div
                                className="ddr-roll-history-body"
                            >
                                <span className="ddr-roll-history-notation">{fav.notation}</span>
                            </div>
                            <button
                                className="ddr-roll-history-reroll"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setNotationInput(fav.notation);
                                }}
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    roll(fav.notation);
                                }}
                                title="Set notation | Right-click to roll"
                                type="button"
                            >
                                <span className="fa-solid fa-rotate-right" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    /* ─── "Recent" tab render ─── */
    const renderRecentTab = () => {
        if (recentNotations.length === 0) {
            return <div className="ddr-roll-history-empty">No recent notations</div>;
        }
        return (
            <div className="ddr-roll-history-content">
                {recentNotations.map((notation, idx) => (
                    <div key={`${notation}-${idx}`} className="ddr-roll-history-item">
                        <div className="ddr-roll-history-row">
                            <div
                                className="ddr-roll-history-body"
                            >
                                <span className="ddr-roll-history-notation">{notation}</span>
                            </div>
                            <button
                                className="ddr-roll-history-reroll"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setNotationInput(notation);
                                }}
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    roll(notation);
                                }}
                                title="Set notation | Right-click to roll"
                                type="button"
                            >
                                <span className="fa-solid fa-rotate-right" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'chat': return renderChatTab();
            case 'favorites': return renderFavoritesTab();
            case 'recent': return renderRecentTab();
            default: return <></>;
        }
    };

    return (
        <div className="ddr-roll-section">
            <div className="ddr-roll-section-header">
                <div className="ddr-roll-tabs">
                    {TABS.map(tab => (
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
