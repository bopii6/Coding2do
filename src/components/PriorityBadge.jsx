import React from 'react';

const PRIORITY_STYLES = {
    now: {
        label: '立刻',
        gradient: 'from-rose-500/70 to-orange-400/70',
        text: 'text-rose-50',
        shadow: 'shadow-[0_10px_25px_rgba(244,63,94,0.25)]',
    },
    later: {
        label: '晚点',
        gradient: 'from-slate-600/60 to-slate-500/60',
        text: 'text-slate-200',
        shadow: 'shadow-[0_10px_25px_rgba(15,23,42,0.4)]',
    },
};

function PriorityBadge({ level = 'now' }) {
    const style = PRIORITY_STYLES[level] || PRIORITY_STYLES.now;

    return (
        <div
            className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] rounded-full bg-gradient-to-r ${style.gradient} ${style.text} ${style.shadow}`}
        >
            <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
            {style.label}
        </div>
    );
}

export default PriorityBadge;
