import React, { useState, useRef, useEffect } from 'react';
import { Check, Trash2, Copy, GripVertical, Edit2 } from 'lucide-react';
import { Reorder, useDragControls } from 'framer-motion';

function TaskItem({ task, onComplete, onDelete, onCopy, onEdit }) {
    const controls = useDragControls();
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(task.text);
    const inputRef = useRef(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleEdit = () => {
        setIsEditing(true);
    };

    const handleSave = () => {
        if (editText.trim() && editText !== task.text) {
            onEdit(task.id, editText.trim());
        }
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditText(task.text);
        setIsEditing(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSave();
        } else if (e.key === 'Escape') {
            handleCancel();
        }
    };

    return (
        <Reorder.Item
            value={task}
            id={task.id}
            dragListener={false}
            dragControls={controls}
            dragMomentum={false}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="group relative overflow-hidden flex items-center justify-between rounded-lg border border-slate-200 dark:border-white/5 bg-white dark:bg-white/[0.02] hover:bg-slate-50 dark:hover:bg-white/[0.04] hover:border-slate-300 dark:hover:border-white/10 p-3 transition-all duration-200"
        >
            <div className="flex items-center gap-3 flex-1 min-w-0 relative z-10">
                <div
                    onPointerDown={(e) => controls.start(e)}
                    className="cursor-grab active:cursor-grabbing text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400 touch-none flex-shrink-0 p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                >
                    <GripVertical className="w-4 h-4" />
                </div>
                {isEditing ? (
                    <input
                        ref={inputRef}
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onBlur={handleSave}
                        onKeyDown={handleKeyDown}
                        className="flex-1 text-sm text-slate-700 dark:text-slate-200 font-medium tracking-tight bg-transparent border-b border-slate-300 dark:border-slate-600 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 px-1 py-0.5"
                    />
                ) : (
                    <span
                        className="text-sm text-slate-700 dark:text-slate-200 font-medium tracking-tight truncate cursor-text hover:text-slate-900 dark:hover:text-white transition-colors"
                        onDoubleClick={handleEdit}
                        title="Double-click to edit"
                    >
                        {task.text}
                    </span>
                )}
            </div>

            <div className="flex items-center gap-1 flex-shrink-0 relative z-10">
                <button
                    onClick={() => onComplete(task.id)}
                    className="p-2 text-slate-500 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-md transition-all duration-200 hover:scale-110"
                    title="Complete"
                >
                    <Check className="w-4 h-4" />
                </button>
                <button
                    onClick={handleEdit}
                    className="p-1.5 text-slate-500 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                    title="Edit task"
                >
                    <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={() => onCopy(task.text)}
                    className="p-1.5 text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                    title="Copy to clipboard"
                >
                    <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={() => onDelete(task.id)}
                    className="p-1.5 text-slate-500 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>
        </Reorder.Item>
    );
}

export default TaskItem;
