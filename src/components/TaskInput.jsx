import React, { useState } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { motion as Motion } from 'framer-motion';

const PRIORITY_OPTIONS = [
    { value: 'now', label: '立刻', hint: 'urgent' },
    { value: 'later', label: '晚点', hint: 'backlog' },
];

function TaskInput({ onAdd }) {
    const [text, setText] = useState('');
    const [priority, setPriority] = useState('now');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (text.trim()) {
            onAdd(text, priority);
            setText('');
            setPriority('now');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="w-full mb-8">
            <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-rose-400 via-fuchsia-500 to-indigo-500 rounded-2xl opacity-20 group-hover:opacity-40 blur transition duration-500"></div>
                <div className="relative rounded-2xl bg-white dark:bg-slate-900 shadow-xl ring-1 ring-slate-900/5 dark:ring-white/10">
                    <div className="flex items-center p-4">
                        <div className="p-2 text-indigo-500 dark:text-indigo-400">
                            <Sparkles className="w-6 h-6" />
                        </div>
                        <input
                            type="text"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="有什么想法？"
                            className="flex-1 bg-transparent text-lg font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none px-2"
                        />
                        <Motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            type="submit"
                            disabled={!text.trim()}
                            className="shrink-0 rounded-xl bg-indigo-600 text-white px-6 py-3 text-base font-semibold shadow-lg shadow-indigo-500/30 hover:bg-indigo-500 hover:shadow-indigo-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            添加想法
                        </Motion.button>
                    </div>
                    <div className="px-6 pb-4 flex items-center gap-4 border-t border-slate-100 dark:border-white/5 pt-3">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">优先级</span>
                        <div className="flex items-center gap-2">
                            {PRIORITY_OPTIONS.map((option) => {
                                const isActive = option.value === priority;
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setPriority(option.value)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${isActive
                                            ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300 ring-1 ring-indigo-500/50'
                                            : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5'
                                            }`}
                                    >
                                        {option.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </form>
    );
}

export default TaskInput;
