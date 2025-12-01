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
            className="group flex items-center justify-between bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-4 mb-3 hover:bg-slate-800 transition-colors relative"
        >
            <div className="flex items-center gap-3 flex-1">
                <div
                    onPointerDown={(e) => controls.start(e)}
                    className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300 touch-none"
                >
                    <GripVertical className="w-5 h-5" />
                </div>
                <span className="text-slate-200 font-medium">{task.text}</span>
            </div>

            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={() => onCopy(task.text)}
                    className="p-2 text-slate-400 hover:text-purple-400 hover:bg-purple-400/10 rounded-md transition-colors"
                    title="Copy to clipboard"
                >
                    <Copy className="w-4 h-4" />
                </button>
                <button
                    onClick={() => onComplete(task.id)}
                    className="p-2 text-slate-400 hover:text-green-400 hover:bg-green-400/10 rounded-md transition-colors"
                    title="Complete"
                >
                    <Check className="w-4 h-4" />
                </button>
                <button
                    onClick={() => onDelete(task.id)}
                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                    title="Delete"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </Reorder.Item>
    );
}

export default TaskItem;
