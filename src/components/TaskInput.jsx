import React, { useState } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { motion as Motion } from 'framer-motion';

function TaskInput({ onAdd }) {
    const [text, setText] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (text.trim()) {
            onAdd(text);
            setText('');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="w-full mb-10">
            <div className="relative group">
                <div className="absolute -inset-[3px] bg-gradient-to-r from-fuchsia-500 via-purple-500 to-sky-500 opacity-60 group-hover:opacity-100 blur-xl rounded-2xl transition duration-500" />
                <div className="relative rounded-2xl border border-white/10 bg-slate-900/70 backdrop-blur-xl p-4 sm:p-5 shadow-[0_25px_60px_rgba(2,6,23,0.7)]">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-fuchsia-500/40 to-purple-500/40 text-fuchsia-100 shadow-inner shadow-fuchsia-900/40">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <p className="text-xs uppercase tracking-[0.3em] text-slate-400 mb-1">Idea capture</p>
                            <div className="flex items-center gap-3">
                                <input
                                    type="text"
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                    placeholder="What's your next idea? (e.g. 'Refactor auth middleware')"
                                    className="w-full bg-transparent text-lg text-white placeholder-slate-400 focus:outline-none"
                                />
                                <Motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    type="submit"
                                    className="shrink-0 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-500 px-4 py-3 text-white font-semibold shadow-lg shadow-fuchsia-900/40"
                                >
                                    <Plus className="w-5 h-5" />
                                </Motion.button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </form>
    );
}

export default TaskInput;
