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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="group relative overflow-hidden flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10 p-3 mb-2 transition-all duration-200"
        >
            <div className="flex items-center gap-3 flex-1 min-w-0 relative z-10">
                <div
                    onPointerDown={(e) => controls.start(e)}
                    className="cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-400 touch-none flex-shrink-0 p-1.5 rounded-md hover:bg-white/5 transition-colors"
                >
                    <GripVertical className="w-4 h-4" />
                </div>
                <span className="text-sm text-slate-200 font-medium tracking-tight truncate">{task.text}</span>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0 relative z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                    onClick={() => onCopy(task.text)}
                    className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-white/10 rounded-md transition-colors"
                    title="Copy to clipboard"
                >
                    <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={() => onComplete(task.id)}
                    className="p-1.5 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-md transition-colors"
                    title="Complete"
                >
                    <Check className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={() => onDelete(task.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors"
                    title="Delete"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>
        </Reorder.Item>
    );
}

export default TaskItem;
