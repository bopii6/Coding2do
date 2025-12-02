import React from 'react';
import { Clock, Trash2, RotateCcw } from 'lucide-react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import PriorityBadge from './PriorityBadge';

function HistoryView({ history, onRestore, onDelete }) {
    if (history.length === 0) {
        return (
            <div className="mt-10 text-center py-8 text-slate-500 border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
                <p className="font-medium tracking-wide">No history yet.</p>
                <p className="text-sm text-slate-500 mt-2">Ship a task to see it remembered here.</p>
            </div>
        );
    }

    return (
        <div className="w-full mt-12 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6 shadow-[0_20px_60px_rgba(2,6,23,0.7)]">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-slate-200">
                <span className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/30 to-blue-500/30 text-emerald-200">
                    <Clock className="w-5 h-5" />
                </span>
                Recently shipped
            </h2>
            <div className="space-y-2">
                <AnimatePresence mode='popLayout'>
                    {history.map((item) => (
                        <Motion.div
                            key={item.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center justify-between rounded-xl bg-white/[0.02] border border-white/5 px-4 py-3 group"
                        >
                            <div className="flex items-center gap-4 flex-1">
                                <PriorityBadge level={item.priority} />
                                <span className="text-slate-400 line-through decoration-slate-600 flex-1">
                                    {item.text}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => onRestore(item.id)}
                                    className="p-1.5 text-slate-500 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors"
                                    title="Restore to queue"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => onDelete(item.id)}
                                    className="p-1.5 text-slate-500 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
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
