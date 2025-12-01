import React from 'react';
import { Check, Trash2, Copy, GripVertical } from 'lucide-react';
import { Reorder, useDragControls } from 'framer-motion';

function TaskItem({ task, onComplete, onDelete, onCopy }) {
    const controls = useDragControls();

    return (
        <Reorder.Item
            value={task}
            id={task.id}
            dragListener={false}
            dragControls={controls}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="group relative overflow-hidden flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-4 sm:p-5 mb-4 shadow-[0_18px_35px_rgba(2,6,23,0.55)] transition duration-300 hover:-translate-y-1"
        >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-300 bg-gradient-to-r from-fuchsia-500/10 via-purple-500/10 to-sky-500/10" />
            <span className="absolute inset-y-2 left-2 w-1 rounded-full bg-gradient-to-b from-fuchsia-500 via-purple-500 to-blue-500" />

            <div className="flex items-center gap-3 flex-1 min-w-0 relative z-10">
                <div
                    onPointerDown={(e) => controls.start(e)}
                    className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-200 touch-none flex-shrink-0 p-2 rounded-xl bg-white/5 border border-white/5"
                >
                    <GripVertical className="w-4 h-4" />
                </div>
                <span className="text-base text-slate-100 font-semibold tracking-tight truncate">{task.text}</span>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0 relative z-10">
                <button
                    onClick={() => onCopy(task.text)}
                    className="p-2 text-slate-400 hover:text-fuchsia-300 hover:bg-fuchsia-500/10 rounded-xl transition-colors"
                    title="Copy to clipboard"
                >
                    <Copy className="w-4 h-4" />
                </button>
                <button
                    onClick={() => onComplete(task.id)}
                    className="p-2 text-slate-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-xl transition-colors"
                    title="Complete"
                >
                    <Check className="w-4 h-4" />
                </button>
                <button
                    onClick={() => onDelete(task.id)}
                    className="p-2 text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-colors"
                    title="Delete"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </Reorder.Item>
    );
}

export default TaskItem;
