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
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <div
                    onPointerDown={(e) => controls.start(e)}
                    className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300 touch-none flex-shrink-0"
                >
                    <GripVertical className="w-5 h-5" />
                </div>
                <span className="text-slate-200 font-medium truncate">{task.text}</span>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0">
                <button
                    onClick={() => onCopy(task.text)}
                    className="p-2 text-slate-400 hover:text-purple-400 hover:bg-purple-400/10 rounded-md transition-colors min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
                    title="Copy to clipboard"
                >
                    <Copy className="w-4 h-4" />
                </button>
                <button
                    onClick={() => onComplete(task.id)}
                    className="p-2 text-slate-400 hover:text-green-400 hover:bg-green-400/10 rounded-md transition-colors min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
                    title="Complete"
                >
                    <Check className="w-4 h-4" />
                </button>
                <button
                    onClick={() => onDelete(task.id)}
                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
                    title="Delete"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </Reorder.Item>
    );
}

export default TaskItem;
