import React from 'react';
import { motion as Motion } from 'framer-motion';

const FILTER_OPTIONS = [
    { value: 'all', label: '全部', icon: '📋' },
    { value: 'now', label: '立刻', icon: '🔥' },
    { value: 'later', label: '晚点', icon: '⏰' },
];

function PriorityFilter({ activeFilter, onFilterChange }) {
    return (
        <div className="w-full mb-6">
            <div className="flex items-center justify-center gap-3">
                {FILTER_OPTIONS.map((option) => {
                    const isActive = option.value === activeFilter;
                    return (
                        <Motion.button
                            key={option.value}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => onFilterChange(option.value)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${isActive
                                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30'
                                    : 'bg-white/50 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-white/80 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10'
                                }`}
                        >
                            <span className="text-lg">{option.icon}</span>
                            <span className="text-sm font-semibold">{option.label}</span>
                        </Motion.button>
                    );
                })}
            </div>
        </div>
    );
}

export default PriorityFilter;
