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
        <form onSubmit={handleSubmit} className="w-full mb-8">
            <div className="relative group">
                <div className="relative rounded-xl bg-white/[0.03] border border-white/10 focus-within:border-white/20 focus-within:bg-white/[0.05] transition-all duration-300">
                    <div className="flex items-center p-2">
                        <div className="p-3 text-slate-400">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <input
                            type="text"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Add a new task..."
                            className="flex-1 bg-transparent text-base text-white placeholder-slate-500 focus:outline-none py-2"
                        />
                        <Motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            className="shrink-0 rounded-lg bg-white text-black px-4 py-2 text-sm font-medium hover:bg-slate-200 transition-colors mr-1"
                        >
                            Add
                        </Motion.button>
                    </div>
                </div>
            </div>
        </form>
    );
}

export default TaskInput;
