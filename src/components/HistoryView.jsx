import React from 'react';
import { Clock, Trash2, RotateCcw } from 'lucide-react';
import { motion as Motion, AnimatePresence } from 'framer-motion';

function HistoryView({ history, onRestore, onDelete }) {
    if (history.length === 0) {
        return (
            <div className="text-center py-8 text-slate-600">
                <p>No history yet.</p>
            </div>
        );
    }

    return (
        <div className="w-full mt-8 border-t border-slate-800 pt-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-slate-400">
                <Clock className="w-5 h-5" />
                History
            </h2>
            <div className="space-y-2">
                <AnimatePresence mode='popLayout'>
                    {history.map((item) => (
                        <Motion.div
                            key={item.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center justify-between bg-slate-900/50 border border-slate-800 rounded-lg p-3 group"
                        >
                            <span className="text-slate-500 line-through decoration-slate-700 flex-1">
                                {item.text}
                            </span>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => onRestore(item.id)}
                                    className="p-1.5 text-slate-500 hover:text-blue-400 hover:bg-blue-400/10 rounded transition-colors"
                                    title="Restore to queue"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => onDelete(item.id)}
                                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                                    title="Delete permanently"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </Motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}

export default HistoryView;
