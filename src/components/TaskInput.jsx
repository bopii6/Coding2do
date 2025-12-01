import React, { useState } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

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
        <form onSubmit={handleSubmit} className="w-full mb-8 relative">
            <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-600 to-purple-600 rounded-lg blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
                <div className="relative flex items-center bg-slate-800 rounded-lg p-1">
                    <Sparkles className="w-5 h-5 text-purple-400 ml-3 mr-2" />
                    <input
                        type="text"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="What's your next idea? (e.g. 'Refactor auth middleware')"
                        className="w-full bg-transparent text-white placeholder-slate-400 focus:outline-none py-3 px-2"
                        autoFocus
                    />
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="submit"
                        className="bg-purple-600 hover:bg-purple-500 text-white p-2 rounded-md transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                    </motion.button>
                </div>
            </div>
        </form>
    );
}

export default TaskInput;
